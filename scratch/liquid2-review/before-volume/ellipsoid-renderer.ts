// Liquid 2 WebGL2 renderer. Order: drink quad (depth = cylinder front face), the pool
// surface with its rolling crest in the same mesh; one depth buffer resolves which liquid
// passes in front of the drink, without a separate ribbon intersecting the pool.
// Simulation state lives on the CPU (LiquidSim) and is uploaded when it changes.

import { project, type Camera, type Drink } from './scene';
import type { LiquidSim } from './sim';
import {
	DRINK_FS,
	DRINK_VS,
	SURFACE_VS,
	DEPTH_FS,
	FLUID_VS,
	FLUID_FS,
	SCREEN_VS,
	BLUR_FS,
	COMPOSITE_FS
} from './shaders';
import { buildSurfaceMesh, createSurfaceGrid, type SurfaceGrid } from './surface';

const PINK = [1, 0.0627451, 0.5058824] as const;
const COMMON_UNIFORMS = [
	'uCam',
	'uRight',
	'uUp',
	'uFwd',
	'uFocal',
	'uAspect',
	'uShift',
	'uTime',
	'uLevel',
	'uCover',
	'uRes',
	'uFade'
] as const;
/** The former ribbon grid is replaced by the pool grid, which is smaller on touch devices. */
/** Touch devices now draw the same connected water body with fewer simulation cells. */
/** World depth over which the far edge of the pool fades into the page. */
const FAR_FADE = 1.8;
type Common = (typeof COMMON_UNIFORMS)[number];

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
	const shader = gl.createShader(type);
	if (!shader) throw new Error('createShader failed');
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		const message = gl.getShaderInfoLog(shader) || 'shader compile failed';
		gl.deleteShader(shader);
		throw new Error(message);
	}
	return shader;
}

function program(gl: WebGL2RenderingContext, vs: string, fs: string) {
	const result = gl.createProgram();
	if (!result) throw new Error('createProgram failed');
	const shaders: WebGLShader[] = [];
	try {
		shaders.push(compile(gl, gl.VERTEX_SHADER, vs));
		shaders.push(compile(gl, gl.FRAGMENT_SHADER, fs));
		for (const shader of shaders) gl.attachShader(result, shader);
		gl.linkProgram(result);
		if (!gl.getProgramParameter(result, gl.LINK_STATUS))
			throw new Error(gl.getProgramInfoLog(result) || 'program link failed');
		return result;
	} catch (error) {
		gl.deleteProgram(result);
		throw error;
	} finally {
		for (const shader of shaders) gl.deleteShader(shader);
	}
}

function locations<T extends readonly string[]>(
	gl: WebGL2RenderingContext,
	prog: WebGLProgram,
	names: T
) {
	return Object.fromEntries(
		names.map((name) => [name, gl.getUniformLocation(prog, name)])
	) as Record<T[number], WebGLUniformLocation | null>;
}

/** Vertex positions now follow radial rings: a fine contact region, then a coarser skirt outward. */

type DepthTarget = {
	framebuffer: WebGLFramebuffer;
	texture: WebGLTexture;
	depth: WebGLRenderbuffer | null;
};

export class Liquid2Renderer {
	private readonly surfaceU;
	private readonly drinkU;
	private readonly fluidU;
	private readonly blurU;
	private readonly compositeU;
	private readonly quad: WebGLBuffer;
	private readonly drinkVao: WebGLVertexArrayObject;
	private readonly fluidVao: WebGLVertexArrayObject;
	private readonly fluidBuffer: WebGLBuffer;
	private readonly imageTexture: WebGLTexture;
	private targets: DepthTarget[] = [];
	private targetWidth = 0;
	private targetHeight = 0;
	private fluidCapacity = 0;
	private imageAspect = 0;
	private meshKey = '';
	private heights = new Float32Array(0);
	private surface: {
		vao: WebGLVertexArrayObject;
		vertex: WebGLBuffer;
		index: WebGLBuffer;
		grid: SurfaceGrid;
	} | null = null;

	private constructor(
		private readonly gl: WebGL2RenderingContext,
		private readonly surfaceProg: WebGLProgram,
		private readonly drinkProg: WebGLProgram,
		private readonly fluidProg: WebGLProgram,
		private readonly blurProg: WebGLProgram,
		private readonly compositeProg: WebGLProgram
	) {
		this.surfaceU = locations(gl, surfaceProg, COMMON_UNIFORMS);
		this.drinkU = locations(gl, drinkProg, [
			...COMMON_UNIFORMS,
			'uImage',
			'uRect',
			'uCylinder',
			'uCupProfile'
		] as const);
		this.fluidU = locations(gl, fluidProg, [
			...COMMON_UNIFORMS,
			'uSolidCylinder',
			'uSolidBase',
			'uSolidBottom'
		] as const);
		this.blurU = locations(gl, blurProg, [
			'uDepth',
			'uDepthSize',
			'uDirection',
			'uFluidScale'
		] as const);
		this.compositeU = locations(gl, compositeProg, [
			...COMMON_UNIFORMS,
			'uDepth',
			'uDepthSize'
		] as const);
		const quad = gl.createBuffer(),
			drinkVao = gl.createVertexArray(),
			fluidVao = gl.createVertexArray(),
			fluidBuffer = gl.createBuffer(),
			imageTexture = gl.createTexture();
		if (!quad || !drinkVao || !fluidVao || !fluidBuffer || !imageTexture)
			throw new Error('liquid2 allocation failed');
		this.quad = quad;
		this.drinkVao = drinkVao;
		this.fluidVao = fluidVao;
		this.fluidBuffer = fluidBuffer;
		this.imageTexture = imageTexture;
		gl.bindBuffer(gl.ARRAY_BUFFER, quad);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
		for (const vao of [drinkVao, fluidVao]) {
			gl.bindVertexArray(vao);
			gl.bindBuffer(gl.ARRAY_BUFFER, quad);
			gl.enableVertexAttribArray(0);
			gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
		}
		gl.bindBuffer(gl.ARRAY_BUFFER, fluidBuffer);
		gl.enableVertexAttribArray(2);
		gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 32, 0);
		gl.vertexAttribDivisor(2, 1);
		gl.enableVertexAttribArray(3);
		gl.vertexAttribPointer(3, 4, gl.FLOAT, false, 32, 16);
		gl.vertexAttribDivisor(3, 1);
		gl.bindVertexArray(null);
		gl.bindTexture(gl.TEXTURE_2D, imageTexture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.enable(gl.DEPTH_TEST);
		gl.depthFunc(gl.LEQUAL);
		gl.disable(gl.DITHER);
	}

	/** Null when WebGL2 or a shader is unavailable; callers show the static fallback. */
	static create(canvas: HTMLCanvasElement): Liquid2Renderer | null {
		let gl: WebGL2RenderingContext | null = null;
		const programs: WebGLProgram[] = [];
		try {
			gl = canvas.getContext('webgl2', {
				alpha: true,
				premultipliedAlpha: true,
				antialias: true,
				depth: true,
				stencil: false,
				powerPreference: 'low-power'
			});
			if (!gl) return null;
			programs.push(
				program(gl, SURFACE_VS, DEPTH_FS),
				program(gl, DRINK_VS, DRINK_FS),
				program(gl, FLUID_VS, FLUID_FS),
				program(gl, SCREEN_VS, BLUR_FS),
				program(gl, SCREEN_VS, COMPOSITE_FS)
			);
			return new Liquid2Renderer(
				gl,
				programs[0],
				programs[1],
				programs[2],
				programs[3],
				programs[4]
			);
		} catch (error) {
			for (const prog of programs) gl?.deleteProgram(prog);
			gl?.getExtension('WEBGL_lose_context')?.loseContext();
			console.warn('[liquid2] renderer unavailable', error);
			return null;
		}
	}

	resize(width: number, height: number): boolean {
		const canvas = this.gl.canvas as HTMLCanvasElement;
		if (canvas.width !== width || canvas.height !== height) {
			canvas.width = width;
			canvas.height = height;
		}
		const w = Math.max(1, Math.round(width * 0.5)),
			h = Math.max(1, Math.round(height * 0.5));
		if (w === this.targetWidth && h === this.targetHeight && this.targets.length === 3) return true;
		const next: DepthTarget[] = [];
		try {
			for (let i = 0; i < 3; i++) next.push(this.createTarget(w, h, i === 0));
			this.disposeTargets(this.targets);
			this.targets = next;
			this.targetWidth = w;
			this.targetHeight = h;
			this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
			return true;
		} catch (error) {
			this.disposeTargets(next);
			this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
			console.warn('[liquid2] fluid targets unavailable', error);
			return false;
		}
	}

	private createTarget(width: number, height: number, withDepth: boolean): DepthTarget {
		const gl = this.gl,
			framebuffer = gl.createFramebuffer(),
			texture = gl.createTexture();
		const depth = withDepth ? gl.createRenderbuffer() : null;
		if (!framebuffer || !texture || (withDepth && !depth)) {
			gl.deleteFramebuffer(framebuffer);
			gl.deleteTexture(texture);
			gl.deleteRenderbuffer(depth);
			throw new Error('liquid2 fluid target allocation failed');
		}
		const target = { framebuffer, texture, depth };
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
		gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
		if (depth) {
			gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
			gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, width, height);
			gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);
		}
		if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
			this.disposeTargets([target]);
			throw new Error('liquid2 incomplete fluid target');
		}
		return target;
	}

	private disposeTargets(targets: DepthTarget[]) {
		for (const target of targets) {
			this.gl.deleteFramebuffer(target.framebuffer);
			this.gl.deleteTexture(target.texture);
			this.gl.deleteRenderbuffer(target.depth);
		}
	}

	/** Null draws no drink: the liquid renders alone. */
	setDrinkImage(image: HTMLImageElement | ImageBitmap | null) {
		const { gl } = this;
		if (!image) {
			this.imageAspect = 0;
			return;
		}
		const width = image instanceof HTMLImageElement ? image.naturalWidth : image.width;
		const height = image instanceof HTMLImageElement ? image.naturalHeight : image.height;
		if (!(width > 0 && height > 0)) {
			this.imageAspect = 0;
			return;
		}
		gl.bindTexture(gl.TEXTURE_2D, this.imageTexture);
		gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
		gl.generateMipmap(gl.TEXTURE_2D);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		this.imageAspect = width / height;
	}

	private ensureSurface(sim: LiquidSim) {
		const field = sim.field,
			drink = sim.drink;
		const key = `${field.cols}:${field.rows}:${field.domain.x0}:${field.domain.z0}:${drink?.x}:${drink?.z}:${drink?.radius}`;
		if (key === this.meshKey && this.surface) return;
		const gl = this.gl,
			grid = createSurfaceGrid(sim);
		this.disposeSurface();
		const vao = gl.createVertexArray(),
			vertex = gl.createBuffer(),
			index = gl.createBuffer();
		if (!vao || !vertex || !index) throw new Error('liquid2 mesh allocation failed');
		gl.bindVertexArray(vao);
		gl.bindBuffer(gl.ARRAY_BUFFER, vertex);
		gl.bufferData(gl.ARRAY_BUFFER, grid.data.byteLength, gl.DYNAMIC_DRAW);
		gl.enableVertexAttribArray(0);
		gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
		gl.enableVertexAttribArray(1);
		gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, grid.indices, gl.STATIC_DRAW);
		gl.bindVertexArray(null);
		this.surface = { vao, vertex, index, grid };
		this.meshKey = key;
	}

	private common(
		u: Record<Common, WebGLUniformLocation | null>,
		cam: Camera,
		sim: LiquidSim,
		time: number,
		cover: number
	) {
		const gl = this.gl;
		gl.uniform3f(u.uCam, ...cam.pos);
		gl.uniform3f(u.uRight, ...cam.right);
		gl.uniform3f(u.uUp, ...cam.up);
		gl.uniform3f(u.uFwd, ...cam.fwd);
		gl.uniform1f(u.uFocal, cam.focal);
		gl.uniform1f(u.uAspect, cam.aspect);
		gl.uniform1f(u.uShift, cam.shift);
		gl.uniform1f(u.uTime, time);
		gl.uniform1f(u.uLevel, sim.level);
		gl.uniform1f(u.uCover, cover);
		gl.uniform2f(u.uRes, gl.drawingBufferWidth, gl.drawingBufferHeight);
		gl.uniform2f(u.uFade, sim.field.domain.z0, sim.field.domain.z0 + FAR_FADE);
	}

	render(cam: Camera, drink: Drink | null, sim: LiquidSim, time: number) {
		const gl = this.gl,
			width = gl.drawingBufferWidth,
			height = gl.drawingBufferHeight;
		const fade = Math.min(1, Math.max(0, (sim.level - (cam.pos[1] - 0.25)) / 0.25));
		const full = fade >= 1 || sim.covered,
			cover = full ? 1 : fade;
		// As the lens nears the surface the page fades to brand pink, without an endpoint cut.
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.viewport(0, 0, width, height);
		gl.enable(gl.DEPTH_TEST);
		gl.disable(gl.BLEND);
		gl.clearColor(PINK[0] * cover, PINK[1] * cover, PINK[2] * cover, cover);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		if (!full && drink && this.imageAspect > 0) {
			const base = project(cam, [drink.x, drink.baseY, drink.z]);
			const top = project(cam, [drink.x, drink.baseY + drink.height, drink.z]);
			const w = ((base.y - top.y) * this.imageAspect) / cam.aspect;
			gl.useProgram(this.drinkProg);
			this.common(this.drinkU, cam, sim, time, cover);
			gl.uniform4f(this.drinkU.uRect, base.x - w / 2, top.y, base.x + w / 2, base.y);
			gl.uniform4f(
				this.drinkU.uCylinder,
				drink.x,
				drink.z,
				drink.radius,
				drink.baseY + drink.height / 2
			);
			gl.uniform3f(
				this.drinkU.uCupProfile,
				drink.baseRadius ?? drink.radius,
				drink.baseY,
				drink.height
			);
			gl.activeTexture(gl.TEXTURE1);
			gl.bindTexture(gl.TEXTURE_2D, this.imageTexture);
			gl.uniform1i(this.drinkU.uImage, 1);
			gl.bindVertexArray(this.drinkVao);
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
		}
		this.ensureSurface(sim);
		const surface = this.surface!;
		if (this.heights.length !== sim.field.height.length)
			this.heights = new Float32Array(sim.field.height.length);
		buildSurfaceMesh(sim, surface.grid, this.heights);
		gl.bindBuffer(gl.ARRAY_BUFFER, surface.vertex);
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, surface.grid.data);
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.targets[0].framebuffer);
		gl.viewport(0, 0, this.targetWidth, this.targetHeight);
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		gl.useProgram(this.surfaceProg);
		this.common(this.surfaceU, cam, sim, time, cover);
		gl.bindVertexArray(surface.vao);
		gl.drawElements(gl.TRIANGLES, surface.grid.indices.length, gl.UNSIGNED_INT, 0);
		const fluid = sim.fluid;
		if (!full && fluid.renderCount > 0) {
			gl.useProgram(this.fluidProg);
			this.common(this.fluidU, cam, sim, time, cover);
			gl.uniform2f(this.fluidU.uRes, this.targetWidth, this.targetHeight);
			const solid = sim.field.obstacle;
			gl.uniform4f(
				this.fluidU.uSolidCylinder,
				solid?.x ?? 0,
				solid?.z ?? 0,
				solid?.radius ?? 0,
				solid ? solid.baseY + solid.height : 0
			);
			gl.uniform1f(this.fluidU.uSolidBase, solid?.baseY ?? 0);
			gl.uniform1f(this.fluidU.uSolidBottom, solid?.baseRadius ?? solid?.radius ?? 0);
			gl.bindVertexArray(this.fluidVao);
			gl.bindBuffer(gl.ARRAY_BUFFER, this.fluidBuffer);
			if (fluid.capacity > this.fluidCapacity) {
				this.fluidCapacity = fluid.capacity;
				gl.bufferData(gl.ARRAY_BUFFER, fluid.capacity * 32, gl.DYNAMIC_DRAW);
			}
			gl.bufferSubData(gl.ARRAY_BUFFER, 0, fluid.renderData.subarray(0, fluid.renderCount * 8));
			gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, fluid.renderCount);
		}
		gl.disable(gl.DEPTH_TEST);
		gl.bindVertexArray(null);
		gl.useProgram(this.blurProg);
		gl.uniform1i(this.blurU.uDepth, 0);
		gl.uniform2f(this.blurU.uDepthSize, this.targetWidth, this.targetHeight);
		gl.uniform1f(this.blurU.uFluidScale, sim.drink?.height ?? 1);
		for (let pass = 0; pass < 4; pass++) {
			const destination = pass % 2 === 0 ? 1 : 2;
			const source = pass === 0 ? 0 : destination === 1 ? 2 : 1;
			gl.bindFramebuffer(gl.FRAMEBUFFER, this.targets[destination].framebuffer);
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, this.targets[source].texture);
			gl.uniform2f(this.blurU.uDirection, pass % 2 === 0 ? 1 : 0, pass % 2 === 0 ? 0 : 1);
			gl.drawArrays(gl.TRIANGLES, 0, 3);
		}
		// Pool and impact volume are shaded together only after their depth is merged.
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.viewport(0, 0, width, height);
		gl.enable(gl.DEPTH_TEST);
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
		gl.useProgram(this.compositeProg);
		this.common(this.compositeU, cam, sim, time, cover);
		gl.uniform1i(this.compositeU.uDepth, 0);
		gl.uniform2f(this.compositeU.uDepthSize, this.targetWidth, this.targetHeight);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.targets[2].texture);
		gl.drawArrays(gl.TRIANGLES, 0, 3);
		gl.disable(gl.BLEND);
		gl.bindVertexArray(null);
	}

	private disposeSurface() {
		if (!this.surface) return;
		this.gl.deleteVertexArray(this.surface.vao);
		this.gl.deleteBuffer(this.surface.vertex);
		this.gl.deleteBuffer(this.surface.index);
		this.surface = null;
	}

	dispose() {
		const gl = this.gl;
		this.disposeSurface();
		this.disposeTargets(this.targets);
		this.targets = [];
		gl.deleteBuffer(this.quad);
		gl.deleteBuffer(this.fluidBuffer);
		gl.deleteVertexArray(this.drinkVao);
		gl.deleteVertexArray(this.fluidVao);
		gl.deleteTexture(this.imageTexture);
		for (const prog of [
			this.surfaceProg,
			this.drinkProg,
			this.fluidProg,
			this.blurProg,
			this.compositeProg
		])
			gl.deleteProgram(prog);
		gl.getExtension('WEBGL_lose_context')?.loseContext();
	}
}
