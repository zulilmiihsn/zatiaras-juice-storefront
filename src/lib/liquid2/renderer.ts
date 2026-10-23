// Liquid 2 WebGL2 renderer. Order: drink quad (depth = cylinder front face), pool surface,
// spray impostors; one depth buffer resolves which liquid passes in front of the drink.
// Simulation state lives on the CPU (LiquidSim) and is uploaded when it changes.

import { project, type Camera, type Drink, type Tier } from './scene';
import type { LiquidSim } from './sim';
import { PARTICLE_STRIDE } from './spray';
import {
	DRINK_FS,
	DRINK_VS,
	SPRAY_FS,
	SPRAY_VS,
	SURFACE_FS,
	SURFACE_VS
} from './shaders';

const PINK = [1, 0.0627451, 0.5058824] as const;
const COMMON_UNIFORMS = [
	'uCam',
	'uRight',
	'uUp',
	'uFwd',
	'uFocal',
	'uAspect',
	'uTime',
	'uLevel',
	'uCover',
	'uRes'
] as const;
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
	return Object.fromEntries(names.map((name) => [name, gl.getUniformLocation(prog, name)])) as Record<
		T[number],
		WebGLUniformLocation | null
	>;
}

/** Vertex positions along one axis: every cell centre, then a coarser skirt outward. */
function axis(start: number, step: number, count: number, before: number[], after: number[]) {
	const out: number[] = [];
	for (const d of before) out.push(start - d);
	for (let i = 0; i < count; i++) out.push(start + (i + 0.5) * step);
	const end = start + count * step;
	for (const d of after) out.push(end + d);
	return out;
}

export class Liquid2Renderer {
	private readonly surfaceU;
	private readonly drinkU;
	private readonly sprayU;
	private readonly quad: WebGLBuffer;
	private readonly corners: WebGLBuffer;
	private readonly drinkVao: WebGLVertexArrayObject;
	private readonly sprayVao: WebGLVertexArrayObject;
	private readonly sprayBuffer: WebGLBuffer;
	private readonly fieldTexture: WebGLTexture;
	private readonly imageTexture: WebGLTexture;
	private surface: {
		vao: WebGLVertexArrayObject;
		vertex: WebGLBuffer;
		index: WebGLBuffer;
		count: number;
	} | null = null;
	private meshKey = '';
	private fieldData = new Float32Array(0);
	private fieldOwner: unknown = null;
	private uploadedField = -1;
	private uploadedSpray = -1;
	private imageAspect = 0;

	private constructor(
		private readonly gl: WebGL2RenderingContext,
		private readonly surfaceProg: WebGLProgram,
		private readonly drinkProg: WebGLProgram,
		private readonly sprayProg: WebGLProgram,
		private readonly maxParticles: number
	) {
		this.surfaceU = locations(gl, surfaceProg, [...COMMON_UNIFORMS, 'uField', 'uDomain', 'uCells'] as const);
		this.drinkU = locations(gl, drinkProg, [...COMMON_UNIFORMS, 'uImage', 'uRect', 'uCylinder'] as const);
		this.sprayU = locations(gl, sprayProg, COMMON_UNIFORMS);
		const quad = gl.createBuffer(),
			drinkVao = gl.createVertexArray(),
			sprayVao = gl.createVertexArray(),
			sprayBuffer = gl.createBuffer(),
			fieldTexture = gl.createTexture(),
			imageTexture = gl.createTexture();
		if (!quad || !drinkVao || !sprayVao || !sprayBuffer || !fieldTexture || !imageTexture)
			throw new Error('liquid2 allocation failed');
		this.quad = quad;
		this.drinkVao = drinkVao;
		this.sprayVao = sprayVao;
		this.sprayBuffer = sprayBuffer;
		this.fieldTexture = fieldTexture;
		this.imageTexture = imageTexture;

		gl.bindBuffer(gl.ARRAY_BUFFER, quad);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
		gl.bindVertexArray(drinkVao);
		gl.enableVertexAttribArray(0);
		gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

		// Spray impostors use signed corners (-1..1); the drink quad uses 0..1.
		const corners = gl.createBuffer();
		if (!corners) throw new Error('liquid2 allocation failed');
		this.corners = corners;
		gl.bindVertexArray(sprayVao);
		gl.enableVertexAttribArray(0);
		gl.bindBuffer(gl.ARRAY_BUFFER, corners);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
		gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
		gl.bindBuffer(gl.ARRAY_BUFFER, sprayBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, this.maxParticles * PARTICLE_STRIDE * 4, gl.DYNAMIC_DRAW);
		const stride = PARTICLE_STRIDE * 4;
		gl.enableVertexAttribArray(1);
		gl.vertexAttribPointer(1, 3, gl.FLOAT, false, stride, 0);
		gl.vertexAttribDivisor(1, 1);
		gl.enableVertexAttribArray(2);
		gl.vertexAttribPointer(2, 3, gl.FLOAT, false, stride, 12);
		gl.vertexAttribDivisor(2, 1);
		gl.enableVertexAttribArray(3);
		gl.vertexAttribPointer(3, 1, gl.FLOAT, false, stride, 24);
		gl.vertexAttribDivisor(3, 1);
		gl.bindVertexArray(null);

		for (const texture of [fieldTexture, imageTexture]) {
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		}
		gl.enable(gl.DEPTH_TEST);
		gl.depthFunc(gl.LEQUAL);
	}

	/** Null when WebGL2 or a shader is unavailable; callers show the static fallback. */
	static create(canvas: HTMLCanvasElement, tier: Tier): Liquid2Renderer | null {
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
			programs.push(program(gl, SURFACE_VS, SURFACE_FS));
			programs.push(program(gl, DRINK_VS, DRINK_FS));
			programs.push(program(gl, SPRAY_VS, SPRAY_FS));
			return new Liquid2Renderer(gl, programs[0], programs[1], programs[2], tier.maxParticles);
		} catch (error) {
			for (const prog of programs) gl?.deleteProgram(prog);
			gl?.getExtension('WEBGL_lose_context')?.loseContext();
			console.warn('[liquid2] renderer unavailable', error);
			return null;
		}
	}

	resize(width: number, height: number) {
		const canvas = this.gl.canvas as HTMLCanvasElement;
		if (canvas.width !== width || canvas.height !== height) {
			canvas.width = width;
			canvas.height = height;
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

	private ensureSurface(sim: LiquidSim, cam: Camera) {
		const field = sim.field;
		const { x0, z0, z1 } = field.domain;
		const key = `${field.cols}x${field.rows}:${x0}:${z0}:${z1}`;
		if (key === this.meshKey && this.surface) return;
		const { gl } = this;
		// Flat skirts: wide on both sides, and from the front edge to behind the camera so
		// the pool never shows an edge as the level rises toward the lens.
		const sides = [0.4, 1, 2, 4, 8];
		const xs = axis(x0, field.dx, field.cols, [...sides].reverse(), sides);
		const reach = Math.max(1, cam.pos[2] + 2 - z1);
		const zs = axis(
			z0,
			field.dz,
			field.rows,
			[],
			[0.05, 0.15, 0.3, 0.5, 0.8, 1.2].map((t) => t * reach)
		);
		const vertices = new Float32Array(xs.length * zs.length * 2);
		let v = 0;
		for (const z of zs)
			for (const x of xs) {
				vertices[v++] = x;
				vertices[v++] = z;
			}
		const nx = xs.length;
		const indices = new Uint32Array((xs.length - 1) * (zs.length - 1) * 6);
		let n = 0;
		for (let j = 0; j < zs.length - 1; j++)
			for (let i = 0; i < nx - 1; i++) {
				const k = j * nx + i;
				indices.set([k, k + nx, k + 1, k + 1, k + nx, k + nx + 1], n);
				n += 6;
			}
		this.disposeSurface();
		const vao = gl.createVertexArray(),
			vertex = gl.createBuffer(),
			index = gl.createBuffer();
		if (!vao || !vertex || !index) throw new Error('liquid2 mesh allocation failed');
		gl.bindVertexArray(vao);
		gl.bindBuffer(gl.ARRAY_BUFFER, vertex);
		gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
		gl.enableVertexAttribArray(0);
		gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
		gl.bindVertexArray(null);
		this.surface = { vao, vertex, index, count: indices.length };
		this.meshKey = key;
	}

	private uploadField(sim: LiquidSim) {
		const { gl } = this;
		const field = sim.field;
		const n = field.cols * field.rows;
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.fieldTexture);
		const fresh = this.fieldOwner !== field;
		if (!fresh && this.uploadedField === field.version) return;
		if (this.fieldData.length !== n * 4) this.fieldData = new Float32Array(n * 4);
		const data = this.fieldData;
		const { height, velX, velZ, cols, rows } = field;
		for (let j = 0; j < rows; j++)
			for (let i = 0; i < cols; i++) {
				const k = j * cols + i;
				const o = k * 4;
				data[o] = height[k];
				data[o + 1] = 0.5 * (velX[j * (cols + 1) + i] + velX[j * (cols + 1) + i + 1]);
				data[o + 2] = 0.5 * (velZ[k] + velZ[k + cols]);
			}
		if (fresh)
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, cols, rows, 0, gl.RGBA, gl.FLOAT, data);
		else gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, cols, rows, gl.RGBA, gl.FLOAT, data);
		this.fieldOwner = field;
		this.uploadedField = field.version;
	}

	private common(u: Record<Common, WebGLUniformLocation | null>, cam: Camera, sim: LiquidSim, time: number, cover: number) {
		const { gl } = this;
		gl.uniform3f(u.uCam, ...cam.pos);
		gl.uniform3f(u.uRight, ...cam.right);
		gl.uniform3f(u.uUp, ...cam.up);
		gl.uniform3f(u.uFwd, ...cam.fwd);
		gl.uniform1f(u.uFocal, cam.focal);
		gl.uniform1f(u.uAspect, cam.aspect);
		gl.uniform1f(u.uTime, time);
		gl.uniform1f(u.uLevel, sim.level);
		gl.uniform1f(u.uCover, cover);
		gl.uniform2f(u.uRes, gl.drawingBufferWidth, gl.drawingBufferHeight);
	}

	render(cam: Camera, drink: Drink | null, sim: LiquidSim, time: number) {
		const { gl } = this;
		const width = gl.drawingBufferWidth;
		const height = gl.drawingBufferHeight;
		gl.viewport(0, 0, width, height);
		// Past the camera the lens is under the surface: the frame is the liquid's colour.
		const cover = Math.min(1, Math.max(0, (sim.level - (cam.pos[1] - 0.25)) / 0.25));
		if (cover >= 1 || sim.covered) {
			gl.clearColor(PINK[0], PINK[1], PINK[2], 1);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
			return;
		}
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

		if (drink && this.imageAspect > 0) {
			const base = project(cam, [drink.x, drink.baseY, drink.z]);
			const top = project(cam, [drink.x, drink.baseY + drink.height, drink.z]);
			const h = base.y - top.y;
			const w = (h * this.imageAspect) / cam.aspect;
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
			gl.activeTexture(gl.TEXTURE1);
			gl.bindTexture(gl.TEXTURE_2D, this.imageTexture);
			gl.uniform1i(this.drinkU.uImage, 1);
			gl.bindVertexArray(this.drinkVao);
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
		}

		this.ensureSurface(sim, cam);
		this.uploadField(sim);
		const field = sim.field;
		gl.useProgram(this.surfaceProg);
		this.common(this.surfaceU, cam, sim, time, cover);
		gl.uniform1i(this.surfaceU.uField, 0);
		gl.uniform4f(this.surfaceU.uDomain, field.domain.x0, field.domain.z0, field.dx, field.dz);
		gl.uniform2i(this.surfaceU.uCells, field.cols, field.rows);
		gl.bindVertexArray(this.surface!.vao);
		gl.drawElements(gl.TRIANGLES, this.surface!.count, gl.UNSIGNED_INT, 0);

		const count = Math.min(sim.spray.count, this.maxParticles);
		if (count > 0) {
			gl.useProgram(this.sprayProg);
			this.common(this.sprayU, cam, sim, time, cover);
			gl.bindVertexArray(this.sprayVao);
			if (this.uploadedSpray !== sim.spray.version) {
				gl.bindBuffer(gl.ARRAY_BUFFER, this.sprayBuffer);
				gl.bufferSubData(gl.ARRAY_BUFFER, 0, sim.spray.data.subarray(0, count * PARTICLE_STRIDE));
				this.uploadedSpray = sim.spray.version;
			}
			gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
		}
		gl.bindVertexArray(null);
	}

	private disposeSurface() {
		if (!this.surface) return;
		const { gl } = this;
		gl.deleteVertexArray(this.surface.vao);
		gl.deleteBuffer(this.surface.vertex);
		gl.deleteBuffer(this.surface.index);
		this.surface = null;
	}

	dispose() {
		const { gl } = this;
		this.disposeSurface();
		gl.deleteBuffer(this.quad);
		gl.deleteBuffer(this.corners);
		gl.deleteBuffer(this.sprayBuffer);
		gl.deleteVertexArray(this.drinkVao);
		gl.deleteVertexArray(this.sprayVao);
		gl.deleteTexture(this.fieldTexture);
		gl.deleteTexture(this.imageTexture);
		gl.deleteProgram(this.surfaceProg);
		gl.deleteProgram(this.drinkProg);
		gl.deleteProgram(this.sprayProg);
		gl.getExtension('WEBGL_lose_context')?.loseContext();
	}
}
