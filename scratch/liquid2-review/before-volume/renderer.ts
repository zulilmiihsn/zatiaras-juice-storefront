// Liquid 2 WebGL2 renderer. Order: drink quad (depth = cylinder front face), the pool
// surface with its rolling crest in the same mesh; one depth buffer resolves which liquid
// passes in front of the drink, without a separate ribbon intersecting the pool.
// Simulation state lives on the CPU (LiquidSim) and is uploaded when it changes.

import { project, type Camera, type Drink } from './scene';
import type { LiquidSim } from './sim';
import { DRINK_FS, DRINK_VS, SURFACE_FS, SURFACE_VS } from './shaders';
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

export class Liquid2Renderer {
	private readonly surfaceU;
	private readonly drinkU;
	private readonly quad: WebGLBuffer;
	private readonly drinkVao: WebGLVertexArrayObject;
	private readonly imageTexture: WebGLTexture;
	private surface: {
		vao: WebGLVertexArrayObject;
		vertex: WebGLBuffer;
		index: WebGLBuffer;
		count: number;
		grid: SurfaceGrid;
	} | null = null;
	private meshKey = '';
	private heights = new Float32Array(0);
	private imageAspect = 0;

	private constructor(
		private readonly gl: WebGL2RenderingContext,
		private readonly surfaceProg: WebGLProgram,
		private readonly drinkProg: WebGLProgram
	) {
		this.surfaceU = locations(gl, surfaceProg, COMMON_UNIFORMS);
		this.drinkU = locations(gl, drinkProg, [
			...COMMON_UNIFORMS,
			'uImage',
			'uRect',
			'uCylinder'
		] as const);
		const quad = gl.createBuffer(),
			drinkVao = gl.createVertexArray(),
			imageTexture = gl.createTexture();
		if (!quad || !drinkVao || !imageTexture) throw new Error('liquid2 allocation failed');
		this.quad = quad;
		this.drinkVao = drinkVao;
		this.imageTexture = imageTexture;

		gl.bindBuffer(gl.ARRAY_BUFFER, quad);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
		gl.bindVertexArray(drinkVao);
		gl.enableVertexAttribArray(0);
		gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

		gl.bindVertexArray(null);

		gl.bindTexture(gl.TEXTURE_2D, imageTexture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.enable(gl.DEPTH_TEST);
		gl.depthFunc(gl.LEQUAL);
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
			programs.push(program(gl, SURFACE_VS, SURFACE_FS));
			programs.push(program(gl, DRINK_VS, DRINK_FS));
			return new Liquid2Renderer(gl, programs[0], programs[1]);
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

	private ensureSurface(sim: LiquidSim) {
		const field = sim.field;
		const { x0, z0, z1 } = field.domain;
		const drink = sim.drink;
		const key = `${field.cols}x${field.rows}:${x0}:${z0}:${z1}:${drink?.x}:${drink?.z}:${drink?.radius}`;
		if (key === this.meshKey && this.surface) return;
		const { gl } = this;
		// Flat skirts: wide on both sides, and from the front edge to behind the camera so
		// the pool never shows an edge as the level rises toward the lens.
		const grid = createSurfaceGrid(sim);
		const vertices = grid.data;
		const indices = grid.indices;
		this.disposeSurface();
		const vao = gl.createVertexArray(),
			vertex = gl.createBuffer(),
			index = gl.createBuffer();
		if (!vao || !vertex || !index) throw new Error('liquid2 mesh allocation failed');
		gl.bindVertexArray(vao);
		gl.bindBuffer(gl.ARRAY_BUFFER, vertex);
		gl.bufferData(gl.ARRAY_BUFFER, vertices.byteLength, gl.DYNAMIC_DRAW);
		gl.enableVertexAttribArray(0);
		gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
		gl.enableVertexAttribArray(1);
		gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
		gl.bindVertexArray(null);
		this.surface = {
			vao,
			vertex,
			index,
			count: indices.length,
			grid
		};
		this.meshKey = key;
	}

	private uploadSurface(sim: LiquidSim) {
		const { gl } = this;
		const n = sim.field.height.length;
		if (this.heights.length !== n) this.heights = new Float32Array(n);
		// The wall geometry changes only when the obstacle is rebuilt, not with the waves.
		// The connected mesh now fades displacement beside that same obstacle directly.
		const surface = this.surface!;
		buildSurfaceMesh(sim, surface.grid, this.heights);
		gl.bindBuffer(gl.ARRAY_BUFFER, surface.vertex);
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, surface.grid.data);
	}

	private common(
		u: Record<Common, WebGLUniformLocation | null>,
		cam: Camera,
		sim: LiquidSim,
		time: number,
		cover: number
	) {
		const { gl } = this;
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
		const back = sim.field.domain.z0;
		gl.uniform2f(u.uFade, back, back + FAR_FADE);
	}

	render(cam: Camera, drink: Drink | null, sim: LiquidSim, time: number) {
		const { gl } = this;
		const width = gl.drawingBufferWidth;
		const height = gl.drawingBufferHeight;
		gl.viewport(0, 0, width, height);
		// Past the camera the lens is under the surface: the frame is the liquid's colour.
		const fade = Math.min(1, Math.max(0, (sim.level - (cam.pos[1] - 0.25)) / 0.25));
		const full = fade >= 1 || sim.covered;
		const cover = full ? 1 : fade;
		// As the lens nears the surface the page behind the pool fades to the liquid colour
		// (premultiplied), so cover arrives as a blend, not a cut. Full cover still draws the
		// surface (all pink) so every frame takes the same path through the pipeline.
		gl.clearColor(PINK[0] * cover, PINK[1] * cover, PINK[2] * cover, cover);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

		if (!full && drink && this.imageAspect > 0) {
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

		this.ensureSurface(sim);
		this.uploadSurface(sim);
		gl.useProgram(this.surfaceProg);
		this.common(this.surfaceU, cam, sim, time, cover);
		// Premultiplied blending for the faded far edge.
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
		gl.bindVertexArray(this.surface!.vao);
		const surface = this.surface!;
		const submerged =
			!sim.drink || this.imageAspect <= 0 || sim.level > sim.drink.baseY + sim.drink.height;
		gl.drawElements(
			gl.TRIANGLES,
			submerged ? surface.count : surface.grid.bodyCount,
			gl.UNSIGNED_INT,
			0
		);

		// Every part of the wave now shares this one grid buffer and index list.
		gl.disable(gl.BLEND);
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
		gl.deleteVertexArray(this.drinkVao);
		gl.deleteTexture(this.imageTexture);
		gl.deleteProgram(this.surfaceProg);
		gl.deleteProgram(this.drinkProg);
		gl.getExtension('WEBGL_lose_context')?.loseContext();
	}
}
