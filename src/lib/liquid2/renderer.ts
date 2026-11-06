// Liquid 2 WebGL2 renderer. Order: drink quad (depth = cylinder front face), the pool
// surface with its rolling crest in the same mesh; one depth buffer resolves which liquid
// passes in front of the drink, without a separate ribbon intersecting the pool.
// Simulation state lives on the CPU (LiquidSim) and is uploaded when it changes.

import { project, type Camera, type Drink } from './scene';
import type { LiquidSim } from './sim';
import type { Fluid } from './fluid';
import {
	DRINK_FS,
	DRINK_VS,
	SURFACE_VS,
	DEPTH_FS,
	VOLUME_FS,
	SCREEN_VS,
	BLUR_FS,
	COMPOSITE_FS,
	DENSITY_VS,
	DENSITY_FS,
	DENSITY_TILES,
	DENSITY_SLICES,
	MASK_VS,
	MASK_FS,
	SHEET_VS,
	SHEET_FS
} from './shaders';
import {
	buildSurfaceMesh,
	createSurfaceGrid,
	type SurfaceGrid,
	createFilmTopology,
	type FilmTopology
} from './surface';

const PINK = [1, 0.0627451, 0.5058824] as const;
const COMMON_UNIFORMS = ['uRes'] as const;
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
	private readonly densityU;
	private readonly maskU;
	private readonly sheetU;
	private readonly quad: WebGLBuffer;
	private readonly drinkVao: WebGLVertexArrayObject;
	private readonly fluidVao: WebGLVertexArrayObject;
	private readonly fluidBuffer: WebGLBuffer;
	private readonly imageTexture: WebGLTexture;
	private readonly sceneBuffer: WebGLBuffer;
	private readonly sceneData = new Float32Array(20);
	private targets: DepthTarget[] = [];
	private targetWidth = 0;
	private targetHeight = 0;
	private densityCapacity = 0;
	private imageAspect = 0;
	private densityTarget: DepthTarget | null = null;
	private densityKey = '';
	private densityWidth = 0;
	private densityHeight = 0;
	private kernelScale = 1;
	private heightTexture: WebGLTexture | null = null;
	private heightKey = '';
	private meshKey = '';
	private heights = new Float32Array(0);
	private densitySamples = new Float32Array(0);
	private sampleCount = 0;
	private volumeWarmed = false;
	private readonly volumeExtent = new Float32Array(3);
	private surface: {
		vao: WebGLVertexArrayObject;
		vertex: WebGLBuffer;
		index: WebGLBuffer;
		grid: SurfaceGrid;
	} | null = null;
	private sheet: {
		vao: WebGLVertexArrayObject;
		index: WebGLBuffer;
		texture: WebGLTexture;
		nodes: Float32Array;
		grid: FilmTopology;
	} | null = null;

	private constructor(
		private readonly gl: WebGL2RenderingContext,
		private readonly surfaceProg: WebGLProgram,
		private readonly drinkProg: WebGLProgram,
		private readonly fluidProg: WebGLProgram,
		private readonly blurProg: WebGLProgram,
		private readonly compositeProg: WebGLProgram,
		private readonly densityProg: WebGLProgram,
		private readonly maskProg: WebGLProgram,
		private readonly sheetProg: WebGLProgram
	) {
		this.surfaceU = locations(gl, surfaceProg, COMMON_UNIFORMS);
		this.sheetU = locations(gl, sheetProg, [
			...COMMON_UNIFORMS,
			'uFilmScale',
			'uCup',
			'uCupBase',
			'uCupBottom',
			'uFilm',
			'uFilmGrid',
			'uHeight',
			'uHeightDomain'
		] as const);
		this.maskU = locations(gl, maskProg, [...COMMON_UNIFORMS, 'uSupport'] as const);
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
			'uMask',
			'uSolidBase',
			'uSolidBottom',
			'uVolume',
			'uVolumeOrigin',
			'uVolumeExtent',
			'uVolumeResolution',
			'uAtlasSize',
			'uDensityScale',
			'uHeight',
			'uHeightDomain',
			'uSupport'
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
			'uDepthSize',
			'uVolumeActive',
			'uVolume',
			'uVolumeOrigin',
			'uVolumeExtent',
			'uVolumeResolution',
			'uAtlasSize',
			'uDensityScale',
			'uHeight',
			'uHeightDomain',
			'uSupport'
		] as const);
		this.densityU = locations(gl, densityProg, [
			'uVolumeOrigin',
			'uVolumeExtent',
			'uVolumeResolution',
			'uAtlasSize',
			'uSupport',
			'uKernelScale'
		] as const);
		const quad = gl.createBuffer(),
			drinkVao = gl.createVertexArray(),
			fluidVao = gl.createVertexArray(),
			fluidBuffer = gl.createBuffer(),
			imageTexture = gl.createTexture(),
			sceneBuffer = gl.createBuffer();
		if (!quad || !drinkVao || !fluidVao || !fluidBuffer || !imageTexture || !sceneBuffer)
			throw new Error('liquid2 allocation failed');
		this.quad = quad;
		this.drinkVao = drinkVao;
		this.fluidVao = fluidVao;
		this.fluidBuffer = fluidBuffer;
		this.imageTexture = imageTexture;
		this.sceneBuffer = sceneBuffer;
		gl.bindBuffer(gl.UNIFORM_BUFFER, sceneBuffer);
		gl.bufferData(gl.UNIFORM_BUFFER, this.sceneData.byteLength, gl.DYNAMIC_DRAW);
		gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, sceneBuffer);
		for (const prog of [surfaceProg, drinkProg, fluidProg, maskProg, compositeProg, sheetProg]) {
			const block = gl.getUniformBlockIndex(prog, 'Scene');
			if (block !== gl.INVALID_INDEX) gl.uniformBlockBinding(prog, block, 0);
		}
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
		gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 16, 0);
		gl.vertexAttribDivisor(2, DENSITY_SLICES);
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
				program(gl, SCREEN_VS, VOLUME_FS),
				program(gl, SCREEN_VS, BLUR_FS),
				program(gl, SCREEN_VS, COMPOSITE_FS),
				program(gl, DENSITY_VS, DENSITY_FS),
				program(gl, MASK_VS, MASK_FS),
				program(gl, SHEET_VS, SHEET_FS)
			);
			return new Liquid2Renderer(
				gl,
				programs[0],
				programs[1],
				programs[2],
				programs[3],
				programs[4],
				programs[5],
				programs[6],
				programs[7]
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
		const fraction = width * height <= 450000 ? 0.45 : 0.5;
		const w = Math.max(1, Math.round(width * fraction)),
			h = Math.max(1, Math.round(height * fraction));
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

	private createTarget(
		width: number,
		height: number,
		withDepth: boolean,
		floating = false
	): DepthTarget {
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
		gl.texImage2D(
			gl.TEXTURE_2D,
			0,
			floating ? gl.RGBA16F : gl.RGBA8,
			width,
			height,
			0,
			gl.RGBA,
			floating ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE,
			null
		);
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
		gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 12, 0);
		gl.disableVertexAttribArray(1);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, grid.indices, gl.STATIC_DRAW);
		gl.bindVertexArray(null);
		this.surface = { vao, vertex, index, grid };
		this.meshKey = key;
	}

	private prepareVolume(sim: LiquidSim): boolean {
		const gl = this.gl,
			fluid = sim.fluid;
		const [nx, ny, nz] = fluid.volumeResolution;
		const width = nx * DENSITY_TILES,
			height = ny * Math.ceil(nz / DENSITY_TILES),
			key = fluid.volumeResolution.join('x');
		try {
			if (!this.densityTarget || key !== this.densityKey) {
				if (this.densityTarget) this.disposeTargets([this.densityTarget]);
				const floating = !!gl.getExtension('EXT_color_buffer_float');
				try {
					this.densityTarget = this.createTarget(width, height, false, floating);
					this.kernelScale = floating ? 1 : 0.25;
				} catch (error) {
					if (!floating) throw error;
					for (let i = 0; i < 8 && gl.getError() !== gl.NO_ERROR; i++) {
						// Drain errors from the failed float-target capability probe before RGBA8 fallback.
					}
					this.densityTarget = this.createTarget(width, height, false);
					this.kernelScale = 0.25;
				}
				this.densityWidth = width;
				this.densityHeight = height;
				this.densityKey = key;
				gl.bindTexture(gl.TEXTURE_2D, this.densityTarget.texture);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
				gl.clearColor(0, 0, 0, 0);
				gl.clear(gl.COLOR_BUFFER_BIT);
			}
			if (!this.heightTexture) {
				this.heightTexture = gl.createTexture();
				if (!this.heightTexture) return false;
				gl.activeTexture(gl.TEXTURE3);
				gl.bindTexture(gl.TEXTURE_2D, this.heightTexture);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			}
			gl.activeTexture(gl.TEXTURE3);
			gl.bindTexture(gl.TEXTURE_2D, this.heightTexture);
			const heightKey = sim.field.cols + 'x' + sim.field.rows;
			if (heightKey !== this.heightKey) {
				gl.texImage2D(
					gl.TEXTURE_2D,
					0,
					gl.R16F,
					sim.field.cols,
					sim.field.rows,
					0,
					gl.RED,
					gl.FLOAT,
					this.heights
				);
				this.heightKey = heightKey;
			} else
				gl.texSubImage2D(
					gl.TEXTURE_2D,
					0,
					0,
					0,
					sim.field.cols,
					sim.field.rows,
					gl.RED,
					gl.FLOAT,
					this.heights
				);
			const capacity = fluid.capacity;
			if (this.densitySamples.length < capacity * 4) {
				this.densitySamples = new Float32Array(capacity * 4);
			}
			this.sampleCount = 0;
			const scale = sim.drink?.height ?? 1;
			this.volumeExtent.set(fluid.volumeExtent);
			this.volumeExtent[1] = scale * 0.65;
			for (let i = 0; i < fluid.renderCount; i++) {
				const x = fluid.densitySamples[i * 4],
					z = fluid.densitySamples[i * 4 + 2];
				if (fluid.densitySamples[i * 4 + 1] > sim.level + sim.field.sample(x, z)) continue;
				for (let j = 0; j < 4; j++)
					this.densitySamples[this.sampleCount * 4 + j] = fluid.densitySamples[i * 4 + j];
				this.sampleCount++;
			}
			if (this.sampleCount === 0 && !this.volumeWarmed) {
				// Prime the density pipeline before the first scroll injects real material.
				this.densitySamples.set([sim.drink?.x ?? 0, sim.level - scale * 0.2, sim.drink?.z ?? 0, 0]);
			}
			if (this.sampleCount > 0 || !this.volumeWarmed) {
				const splats = this.sampleCount || 1;
				gl.bindFramebuffer(gl.FRAMEBUFFER, this.densityTarget.framebuffer);
				gl.viewport(0, 0, width, height);
				gl.disable(gl.DEPTH_TEST);
				gl.enable(gl.BLEND);
				gl.blendEquation(gl.FUNC_ADD);
				gl.blendFunc(gl.ONE, gl.ONE);
				gl.clearColor(0, 0, 0, 0);
				gl.clear(gl.COLOR_BUFFER_BIT);
				gl.useProgram(this.densityProg);
				gl.uniform3fv(this.densityU.uVolumeOrigin, fluid.volumeOrigin);
				gl.uniform3fv(this.densityU.uVolumeExtent, this.volumeExtent);
				gl.uniform3f(this.densityU.uVolumeResolution, ...fluid.volumeResolution);
				gl.uniform2f(this.densityU.uAtlasSize, width, height);
				gl.uniform1f(this.densityU.uSupport, fluid.smoothingRadius);
				gl.uniform1f(this.densityU.uKernelScale, this.kernelScale);
				gl.bindVertexArray(this.fluidVao);
				gl.bindBuffer(gl.ARRAY_BUFFER, this.fluidBuffer);
				if (capacity > this.densityCapacity) {
					this.densityCapacity = capacity;
					gl.bufferData(gl.ARRAY_BUFFER, capacity * 16, gl.DYNAMIC_DRAW);
				}
				gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.densitySamples.subarray(0, splats * 4));
				gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, splats * DENSITY_SLICES);
			}
			gl.activeTexture(gl.TEXTURE2);
			gl.bindTexture(gl.TEXTURE_2D, this.densityTarget.texture);
			gl.bindFramebuffer(gl.FRAMEBUFFER, this.targets[0].framebuffer);
			gl.viewport(0, 0, this.targetWidth, this.targetHeight);
			gl.enable(gl.DEPTH_TEST);
			gl.disable(gl.BLEND);
			gl.bindVertexArray(null);
			return true;
		} catch (error) {
			console.warn('[liquid2] density reconstruction unavailable', error);
			return false;
		}
	}
	private volumeUniforms(
		u: Record<
			| 'uVolume'
			| 'uVolumeOrigin'
			| 'uVolumeExtent'
			| 'uVolumeResolution'
			| 'uAtlasSize'
			| 'uDensityScale'
			| 'uHeight'
			| 'uHeightDomain'
			| 'uSupport',
			WebGLUniformLocation | null
		>,
		fluid: Fluid,
		sim: LiquidSim
	) {
		const gl = this.gl;
		gl.uniform1i(u.uVolume, 2);
		gl.uniform1i(u.uHeight, 3);
		gl.uniform3fv(u.uVolumeOrigin, fluid.volumeOrigin);
		gl.uniform3fv(u.uVolumeExtent, this.volumeExtent);
		gl.uniform3f(u.uVolumeResolution, ...fluid.volumeResolution);
		gl.uniform2f(u.uAtlasSize, this.densityWidth, this.densityHeight);
		gl.uniform1f(u.uDensityScale, 1 / this.kernelScale);
		gl.uniform1f(u.uSupport, fluid.smoothingRadius);
		const d = sim.field.domain;
		gl.uniform4f(u.uHeightDomain, d.x0, d.z0, d.x1 - d.x0, d.z1 - d.z0);
	}

	private common(u: Record<Common, WebGLUniformLocation | null>) {
		const gl = this.gl;
		gl.uniform2f(u.uRes, gl.drawingBufferWidth, gl.drawingBufferHeight);
	}

	render(cam: Camera, drink: Drink | null, sim: LiquidSim, time: number) {
		const gl = this.gl,
			width = gl.drawingBufferWidth,
			height = gl.drawingBufferHeight;
		const fade = Math.min(1, Math.max(0, (sim.level - (cam.pos[1] - 0.25)) / 0.25));
		const full = fade >= 1 || sim.covered,
			cover = full ? 1 : fade;
		// std140 packs each vec3 with its following scalar into one 16-byte slot.
		const scene = this.sceneData;
		scene.set(cam.pos, 0);
		scene[3] = cam.focal;
		scene.set(cam.right, 4);
		scene[7] = cam.aspect;
		scene.set(cam.up, 8);
		scene[11] = cam.shift;
		scene.set(cam.fwd, 12);
		scene[15] = time;
		scene[16] = sim.level;
		scene[17] = cover;
		scene[18] = sim.field.domain.z0;
		scene[19] = sim.field.domain.z0 + FAR_FADE;
		gl.bindBuffer(gl.UNIFORM_BUFFER, this.sceneBuffer);
		gl.bufferSubData(gl.UNIFORM_BUFFER, 0, scene);
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
			this.common(this.drinkU);
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
		gl.bufferData(gl.ARRAY_BUFFER, surface.grid.data.byteLength, gl.STREAM_DRAW);
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, surface.grid.data);
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.targets[0].framebuffer);
		gl.viewport(0, 0, this.targetWidth, this.targetHeight);
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		gl.useProgram(this.surfaceProg);
		this.common(this.surfaceU);
		gl.bindVertexArray(surface.vao);
		gl.drawElements(gl.TRIANGLES, surface.grid.indices.length, gl.UNSIGNED_INT, 0);
		const fluid = sim.fluid;

		if (!this.prepareVolume(sim)) {
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			return false;
		}
		if (!full && (this.sampleCount > 0 || !this.volumeWarmed)) {
			gl.bindFramebuffer(gl.FRAMEBUFFER, this.targets[1].framebuffer);
			gl.disable(gl.DEPTH_TEST);
			gl.disable(gl.BLEND);
			gl.clearColor(0, 0, 0, 0);
			gl.clear(gl.COLOR_BUFFER_BIT);
			gl.useProgram(this.maskProg);
			this.common(this.maskU);
			gl.uniform1f(this.maskU.uSupport, fluid.smoothingRadius);
			gl.bindVertexArray(this.fluidVao);
			gl.vertexAttribDivisor(2, 1);
			gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.sampleCount || 1);
			gl.vertexAttribDivisor(2, DENSITY_SLICES);
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, this.targets[1].texture);
			gl.bindFramebuffer(gl.FRAMEBUFFER, this.targets[0].framebuffer);
			gl.enable(gl.DEPTH_TEST);
			gl.useProgram(this.fluidProg);
			gl.uniform1i(this.fluidU.uMask, 0);
			this.common(this.fluidU);
			gl.uniform2f(this.fluidU.uRes, this.targetWidth, this.targetHeight);
			this.volumeUniforms(this.fluidU, fluid, sim);
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
			gl.bindVertexArray(null);
			gl.drawArrays(gl.TRIANGLES, 0, 3);
			this.volumeWarmed = true;
		}

		gl.disable(gl.DEPTH_TEST);
		gl.bindVertexArray(null);
		gl.useProgram(this.blurProg);
		gl.uniform1i(this.blurU.uDepth, 0);
		gl.uniform2f(this.blurU.uDepthSize, this.targetWidth, this.targetHeight);
		gl.uniform1f(this.blurU.uFluidScale, sim.drink?.height ?? 1);
		for (let pass = 0; pass < 2; pass++) {
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
		this.common(this.compositeU);
		this.volumeUniforms(this.compositeU, fluid, sim);
		gl.uniform1f(this.compositeU.uVolumeActive, this.sampleCount > 0 ? 1 : 0);
		gl.uniform1i(this.compositeU.uDepth, 0);
		gl.uniform2f(this.compositeU.uDepthSize, this.targetWidth, this.targetHeight);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.targets[2].texture);
		gl.drawArrays(gl.TRIANGLES, 0, 3);
		gl.disable(gl.BLEND);

		if (
			!full &&
			sim.drink &&
			(!this.sheet || sim.sheets.exposedHeight > sim.drink.height * 0.005)
		) {
			const material = sim.sheets;
			if (!this.sheet) {
				const vao = gl.createVertexArray(),
					index = gl.createBuffer(),
					texture = gl.createTexture();
				if (!vao || !index || !texture) {
					gl.deleteVertexArray(vao);
					gl.deleteBuffer(index);
					gl.deleteTexture(texture);
					return false;
				}
				const grid = createFilmTopology(sim);
				const nodes = new Float32Array((material.vertices.length / 3) * 8);
				this.sheet = { vao, index, texture, nodes, grid };
				gl.bindVertexArray(vao);
				gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index);
				gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, grid.indices, gl.STATIC_DRAW);
				gl.activeTexture(gl.TEXTURE4);
				gl.bindTexture(gl.TEXTURE_2D, texture);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
				gl.texImage2D(
					gl.TEXTURE_2D,
					0,
					gl.RGBA32F,
					material.cols * 2,
					material.rows * grid.patches,
					0,
					gl.RGBA,
					gl.FLOAT,
					null
				);
			}
			const sheet = this.sheet,
				width = material.cols * 2;
			for (let i = 0; i < material.areas.length; i++) {
				const row = Math.floor(i / material.cols),
					col = i % material.cols;
				const p = (row * width + col) * 4,
					n = p + material.cols * 4,
					k = i * 3;
				sheet.nodes[p] = material.vertices[k];
				sheet.nodes[p + 1] = material.vertices[k + 1];
				sheet.nodes[p + 2] = material.vertices[k + 2];
				sheet.nodes[p + 3] = material.areas[i];
				sheet.nodes[n] = material.normals[k];
				sheet.nodes[n + 1] = material.normals[k + 1];
				sheet.nodes[n + 2] = material.normals[k + 2];
				sheet.nodes[n + 3] = material.referenceAreas[i];
			}
			gl.activeTexture(gl.TEXTURE4);
			gl.bindTexture(gl.TEXTURE_2D, sheet.texture);
			gl.texSubImage2D(
				gl.TEXTURE_2D,
				0,
				0,
				0,
				width,
				material.rows * sheet.grid.patches,
				gl.RGBA,
				gl.FLOAT,
				sheet.nodes
			);
			gl.useProgram(this.sheetProg);
			this.common(this.sheetU);
			gl.uniform1f(this.sheetU.uFilmScale, sim.drink.height);
			gl.uniform1i(this.sheetU.uFilm, 4);
			gl.uniform1i(this.sheetU.uHeight, 3);
			gl.uniform4f(
				this.sheetU.uFilmGrid,
				material.rows,
				material.cols,
				sheet.grid.rows,
				sheet.grid.cols
			);
			const d = sim.field.domain;
			gl.uniform4f(this.sheetU.uHeightDomain, d.x0, d.z0, d.x1 - d.x0, d.z1 - d.z0);
			const solid = sim.field.obstacle;
			gl.uniform4f(
				this.sheetU.uCup,
				solid?.x ?? 0,
				solid?.z ?? 0,
				solid?.radius ?? 0,
				solid ? solid.baseY + solid.height : 0
			);
			gl.uniform1f(this.sheetU.uCupBase, solid?.baseY ?? 0);
			gl.uniform1f(this.sheetU.uCupBottom, solid?.baseRadius ?? solid?.radius ?? 0);
			gl.bindVertexArray(sheet.vao);
			gl.enable(gl.CULL_FACE);
			gl.cullFace(gl.BACK);
			gl.drawElements(gl.TRIANGLES, sheet.grid.indices.length, gl.UNSIGNED_INT, 0);
			gl.disable(gl.CULL_FACE);
		}

		gl.bindVertexArray(null);
		return true;
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
		if (this.sheet) {
			gl.deleteVertexArray(this.sheet.vao);
			gl.deleteTexture(this.sheet.texture);
			gl.deleteBuffer(this.sheet.index);
			this.sheet = null;
		}
		this.disposeTargets(this.targets);
		this.targets = [];
		gl.deleteBuffer(this.quad);
		gl.deleteBuffer(this.fluidBuffer);
		gl.deleteBuffer(this.sceneBuffer);
		gl.deleteVertexArray(this.drinkVao);
		gl.deleteVertexArray(this.fluidVao);
		gl.deleteTexture(this.imageTexture);
		gl.deleteTexture(this.heightTexture);
		if (this.densityTarget) this.disposeTargets([this.densityTarget]);
		for (const prog of [
			this.surfaceProg,
			this.drinkProg,
			this.fluidProg,
			this.blurProg,
			this.compositeProg,
			this.densityProg,
			this.maskProg,
			this.sheetProg
		])
			gl.deleteProgram(prog);
		gl.getExtension('WEBGL_lose_context')?.loseContext();
	}
}
