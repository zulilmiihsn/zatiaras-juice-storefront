const fs = require('fs');
const f = 'src/lib/liquid/renderer.ts';
let s = fs.readFileSync(f, 'utf8');
const rep = (a, b) => { if (!s.includes(a)) throw new Error('missing: ' + a.slice(0, 70)); s = s.replace(a, b); };
rep("import type { LiquidSim } from './sim';", "import type { Crown } from './crown';\nimport type { LiquidSim } from './sim';");
rep(`layout(location = 0) in vec2 aPos;
uniform float uAspect;
uniform float uPointSize;`, `layout(location = 0) in vec2 aPos;
layout(location = 1) in float aRadius; // world units
uniform float uAspect;
uniform float uPointSize; // field pixels per world radius`);
rep('\tgl_PointSize = uPointSize;', '\tgl_PointSize = aRadius * uPointSize;');
rep('\tprivate readonly vao: WebGLVertexArrayObject;', '\tprivate readonly vao: WebGLVertexArrayObject;\n\tprivate readonly crownVao: WebGLVertexArrayObject;\n\tprivate readonly crownBuffer: WebGLBuffer;');
rep(`		const vao = gl.createVertexArray();`, `		const crownVao = gl.createVertexArray();
		const crownBuffer = gl.createBuffer();
		if (!crownVao || !crownBuffer) throw new Error('WebGL allocation failed');
		this.crownVao = crownVao;
		this.crownBuffer = crownBuffer;
		const vao = gl.createVertexArray();`);
rep(`		gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
		gl.bindVertexArray(null);`, `		gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
		gl.bindVertexArray(crownVao);
		gl.bindBuffer(gl.ARRAY_BUFFER, crownBuffer);
		gl.enableVertexAttribArray(0);
		gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 12, 0);
		gl.enableVertexAttribArray(1);
		gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 12, 8);
		gl.bindVertexArray(null);`);
rep('\trender(sim: LiquidSim, frame: FrameState): void {', '\trender(sim: LiquidSim, crown: Crown, frame: FrameState): void {');
rep(`		gl.uniform1f(this.u['splat.uPointSize'], sim.radius * 2.7 * this.fieldH);`, `		// Kernel wider than the radius fuses neighbours into one surface.
		gl.uniform1f(this.u['splat.uPointSize'], 2.7 * this.fieldH);`);
rep(`		gl.drawArrays(gl.POINTS, 0, sim.capacity);`, `		gl.vertexAttrib1f(1, sim.radius); // particles share one radius
		gl.drawArrays(gl.POINTS, 0, sim.capacity);
		gl.bindVertexArray(this.crownVao);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.crownBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, crown.points, gl.STREAM_DRAW);
		gl.drawArrays(gl.POINTS, 0, crown.count);`);
rep('\t\tgl.deleteVertexArray(this.vao);', '\t\tgl.deleteVertexArray(this.vao);\n\t\tgl.deleteVertexArray(this.crownVao);\n\t\tgl.deleteBuffer(this.crownBuffer);');
fs.writeFileSync(f, s);
