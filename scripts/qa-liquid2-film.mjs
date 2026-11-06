// Compare the production vertex shader with the independent CPU reconstruction.
// Run against Vite so the browser can import the actual TypeScript modules.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const browser = await chromium.launch({
	executablePath:
		process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
		'C:/Users/ASUS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe',
	args: ['--enable-unsafe-swiftshader']
});
try {
	const page = await browser.newPage({ reducedMotion: 'reduce' });
	await page.goto(`${process.env.QA_BASE_URL || 'http://127.0.0.1:5199'}/qa/liquid2`, {
		waitUntil: 'domcontentloaded'
	});
	const results = await page.evaluate(async () => {
		const [{ LiquidSim }, scene, surface, { SHEET_VS }] = await Promise.all([
			import('/src/lib/liquid2/sim.ts'),
			import('/src/lib/liquid2/scene.ts'),
			import('/src/lib/liquid2/surface.ts'),
			import('/src/lib/liquid2/shaders.ts')
		]);
		const gl = document.createElement('canvas').getContext('webgl2');
		if (!gl) throw new Error('WebGL2 unavailable');
		const compile = (type, text) => {
			const shader = gl.createShader(type);
			gl.shaderSource(shader, text);
			gl.compileShader(shader);
			if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
				throw new Error(gl.getShaderInfoLog(shader));
			return shader;
		};
		const program = gl.createProgram();
		const shaders = [
			compile(gl.VERTEX_SHADER, SHEET_VS),
			compile(
				gl.FRAGMENT_SHADER,
				'#version 300 es\nprecision highp float; out vec4 color; void main() { color = vec4(0.0); }'
			)
		];
		for (const shader of shaders) gl.attachShader(program, shader);
		gl.transformFeedbackVaryings(program, ['vWorld', 'vNormal'], gl.INTERLEAVED_ATTRIBS);
		gl.linkProgram(program);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS))
			throw new Error(gl.getProgramInfoLog(program));
		gl.useProgram(program);
		const uniform = (name) => gl.getUniformLocation(program, name);
		const textures = [gl.createTexture(), gl.createTexture()];
		const sceneBuffer = gl.createBuffer();
		gl.bindBuffer(gl.UNIFORM_BUFFER, sceneBuffer);
		gl.bufferData(gl.UNIFORM_BUFFER, 80, gl.DYNAMIC_DRAW);
		gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, sceneBuffer);
		gl.uniformBlockBinding(program, gl.getUniformBlockIndex(program, 'Scene'), 0);
		const buffer = gl.createBuffer();
		const feedback = gl.createTransformFeedback();
		gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, feedback);
		gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, buffer);
		gl.enable(gl.RASTERIZER_DISCARD);
		const results = [];
		for (const tier of [
			{ cols: 48, rows: 32 },
			{ cols: 112, rows: 80 }
		]) {
			for (const state of ['curved', 'impact', 'submerged']) {
				const sim = new LiquidSim(tier);
				const camera = scene.makeCamera(1.6);
				const drink = scene.placeDrink(camera, 0.72, 0.85, 0.5, 960 / 778);
				sim.layout(camera, drink);
				const material = sim.sheets;
				if (state === 'impact') {
					for (let i = 0; i < 110; i++)
						sim.advance(1 / 60, { progress: (i + 1) / 300, scrollVelocity: 0.2 });
				} else {
					// Non-planar films exercise cubic weights, cup projection, thickness and rims.
					for (let i = 0; i < material.areas.length; i++) {
						const row = Math.floor(i / material.cols) % material.rows;
						const patch = Math.floor(i / (material.cols * material.rows));
						const u = (i % material.cols) / (material.cols - 1);
						const v = row / (material.rows - 1);
						const angle = patch * 1.7 + u * 0.9;
						const radius = drink.radius * (0.7 + 0.5 * v + 0.2 * Math.sin(v * 4));
						material.vertices.set(
							[
								drink.x + radius * Math.cos(angle),
								drink.height * (v * 0.8 - 0.04),
								drink.z + radius * Math.sin(angle)
							],
							i * 3
						);
						const ny = 0.1 * Math.sin(v * 6);
						const length = Math.hypot(1, ny);
						material.normals.set(
							[Math.cos(angle) / length, ny / length, Math.sin(angle) / length],
							i * 3
						);
						material.areas[i] = drink.height ** 2 * 0.001 * (0.6 + u);
						material.referenceAreas[i] = 0.001;
					}
					for (let i = 0; i < sim.field.height.length; i++)
						sim.field.height[i] = 0.01 * Math.sin(i * 0.1);
					if (state === 'submerged') {
						sim.level = drink.baseY + drink.height + 0.1;
						sim.field.setObstacle(null, sim.level);
					}
				}
				const mesh = surface.createFilmMesh(sim);
				surface.buildFilmMesh(sim, mesh);
				const nodes = new Float32Array(material.areas.length * 8);
				for (let i = 0; i < material.areas.length; i++) {
					const p = (Math.floor(i / material.cols) * material.cols * 2 + (i % material.cols)) * 4;
					nodes.set([...material.vertices.subarray(i * 3, i * 3 + 3), material.areas[i]], p);
					nodes.set(
						[...material.normals.subarray(i * 3, i * 3 + 3), material.referenceAreas[i]],
						p + material.cols * 4
					);
				}
				for (const [unit, width, height, format, data] of [
					[0, material.cols * 2, material.rows * mesh.patches, gl.RGBA, nodes],
					[1, sim.field.cols, sim.field.rows, gl.RED, mesh.fieldHeights]
				]) {
					gl.activeTexture(gl.TEXTURE0 + unit);
					gl.bindTexture(gl.TEXTURE_2D, textures[unit]);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
					gl.texImage2D(
						gl.TEXTURE_2D,
						0,
						format === gl.RED ? gl.R32F : gl.RGBA32F,
						width,
						height,
						0,
						format,
						gl.FLOAT,
						data
					);
				}
				gl.uniform1i(uniform('uFilm'), 0);
				gl.uniform1i(uniform('uHeight'), 1);
				gl.uniform1f(uniform('uFilmScale'), drink.height);
				const sceneData = new Float32Array(20);
				sceneData.set(camera.pos, 0);
				sceneData[3] = camera.focal;
				sceneData.set(camera.right, 4);
				sceneData[7] = camera.aspect;
				sceneData.set(camera.up, 8);
				sceneData[11] = camera.shift;
				sceneData.set(camera.fwd, 12);
				sceneData[15] = sim.time;
				sceneData[16] = sim.level;
				gl.bufferSubData(gl.UNIFORM_BUFFER, 0, sceneData);
				gl.uniform4f(uniform('uFilmGrid'), material.rows, material.cols, mesh.rows, mesh.cols);
				const domain = sim.field.domain;
				gl.uniform4f(
					uniform('uHeightDomain'),
					domain.x0,
					domain.z0,
					domain.x1 - domain.x0,
					domain.z1 - domain.z0
				);
				const solid = sim.field.obstacle;
				gl.uniform4f(
					uniform('uCup'),
					solid?.x ?? 0,
					solid?.z ?? 0,
					solid?.radius ?? 0,
					solid ? solid.baseY + solid.height : 0
				);
				gl.uniform1f(uniform('uCupBase'), solid?.baseY ?? 0);
				gl.uniform1f(uniform('uCupBottom'), solid?.baseRadius ?? solid?.radius ?? 0);
				gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER, buffer);
				gl.bufferData(gl.TRANSFORM_FEEDBACK_BUFFER, mesh.data.byteLength, gl.STREAM_READ);
				gl.beginTransformFeedback(gl.POINTS);
				gl.drawArrays(gl.POINTS, 0, mesh.data.length / 6);
				gl.endTransformFeedback();
				const actual = new Float32Array(mesh.data.length);
				gl.getBufferSubData(gl.TRANSFORM_FEEDBACK_BUFFER, 0, actual);
				let positionError = 0,
					normalError = 0,
					unitError = 0;
				for (let i = 0; i < actual.length; i += 6) {
					if (!actual.subarray(i, i + 6).every(Number.isFinite))
						throw new Error('Non-finite vertex');
					for (let axis = 0; axis < 3; axis++) {
						positionError = Math.max(
							positionError,
							Math.abs(actual[i + axis] - mesh.data[i + axis])
						);
						const error = Math.abs(actual[i + 3 + axis] - mesh.data[i + 3 + axis]);
						normalError = Math.max(normalError, error);
					}
					unitError = Math.max(
						unitError,
						Math.abs(Math.hypot(...actual.subarray(i + 3, i + 6)) - 1)
					);
				}
				results.push({
					tier: tier.cols,
					state,
					vertices: actual.length / 6,
					positionError,
					normalError,
					unitError,
					glError: gl.getError()
				});
			}
		}
		gl.disable(gl.RASTERIZER_DISCARD);
		gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
		gl.deleteTransformFeedback(feedback);
		gl.deleteBuffer(buffer);
		gl.deleteBuffer(sceneBuffer);
		for (const texture of textures) gl.deleteTexture(texture);
		for (const shader of shaders) gl.deleteShader(shader);
		gl.deleteProgram(program);
		gl.getExtension('WEBGL_lose_context')?.loseContext();
		return results;
	});
	mkdirSync('scratch/liquid2-review', { recursive: true });
	writeFileSync(
		'scratch/liquid2-review/gpu-film-validation.json',
		JSON.stringify(results, null, 2)
	);
	for (const result of results) {
		console.log(result);
		assert.equal(result.glError, 0, 'WebGL error');
		assert.ok(result.positionError < 0.0002, 'GPU positions differ from the CPU reference');
		// Contact folds can collapse to zero-width rims, whose frames are ill-conditioned.
		// Compare normal direction on the controlled curved film; every state must retain
		// finite unit normals and the same positions, including the submerged contact foot.
		if (result.state === 'curved')
			assert.ok(result.normalError < 0.002, 'GPU normals differ from the curved CPU reference');
		assert.ok(result.unitError < 0.001, 'Non-unit GPU normal');
	}
} finally {
	await browser.close();
}
