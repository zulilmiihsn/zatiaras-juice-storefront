import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
const pending = new Map();
function edit(path, apply) {
	let source = readFileSync(path, 'utf8').replaceAll('\r\n', '\n');
	const one = (pattern, value) => {
		const regex = typeof pattern === 'string' ? new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g') : new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
		const count = [...source.matchAll(regex)].length;
		if (count !== 1) throw new Error(`${path}: expected one ${pattern}; found ${count}`);
		source = source.replace(regex, value);
	};
	const block = (start, finish) => {
		const a = source.indexOf(start), b = source.indexOf(finish, a + start.length);
		if (a < 0 || b < 0) throw new Error(`${path}: missing block ${start}`);
		source = source.slice(0, a) + source.slice(b);
	};
	apply(one, block, (from, to) => { source = source.replaceAll(from, to); });
	pending.set(path, source);
}
edit('src/lib/liquid2/sheets.ts', (one) => {
	one('readonly normals: Float32Array;', 'readonly normals: Float32Array;\n\treadonly areas: Float32Array;');
	one('this.normals = new Float32Array(this.vertices.length);', 'this.normals = new Float32Array(this.vertices.length);\n\t\tthis.areas = new Float32Array(this.vertices.length / 3);');
	one(/const angle = this.angle\(patch, col\),\s*nx = Math.cos\(angle\),\s*nz = Math.sin\(angle\);/, 'const dx = p[k] - drink.x, dz = p[k + 2] - drink.z;\n\t\t\t\t\tconst radius = Math.max(1e-6, Math.hypot(dx, dz));\n\t\t\t\t\tconst nx = dx / radius, nz = dz / radius;');
	one(/const radial =[^;]+;/, 'const radial = Math.max(0, v[k + 1]) * (drink.radius - (drink.baseRadius ?? drink.radius)) / h;');
	one('const energy = 0.8 * this.inlet[inlet] * (1 - 0.32 * across * across);', 'const energy = 0.8 * Math.min(fluid.speed * fluid.speed, this.inlet[inlet]) * (1 - 0.32 * across * across);');
	one('n.fill(0);', 'n.fill(0);\n\t\tthis.areas.fill(0);');
	one(/const nx = ay \* bz - az \* by,[\s\S]*?nz = ax \* by - ay \* bx;/, '$&\n\t\t\tconst area = Math.hypot(nx, ny, nz) / 6;');
	one('const k = this.indices[i + corner] * 3;', 'const k = this.indices[i + corner] * 3;\n\t\t\t\tthis.areas[k / 3] += area;');
});
edit('src/lib/liquid2/renderer.ts', (one, block, all) => {
	one(',\n\tSHEET_VS,\n\tSHEET_FS', '');
	one('\tprivate readonly sheetU;\n', '');
	one(/\tprivate sheet: \{[\s\S]*?\} \| null = null;\n/, '');
	one(',\n\t\tprivate readonly sheetProg: WebGLProgram', '');
	one(/\t\tthis.sheetU = locations\([^\n]+\n/, '');
	one(',\n\t\t\t\tprogram(gl, SHEET_VS, SHEET_FS)', '');
	one(',\n\t\t\t\tprograms[6]', '');
	block('\t\tif (!this.sheet) {', '\t\tconst fluid = sim.fluid;');
	one(/\t\tif \(!full && sim.sheets.indexCount > 0\) \{[\s\S]*?\n\t\t\}\n/, '');
	one(/\t\tif \(this.sheet\) \{[\s\S]*?\n\t\t\}\n/, '');
	one(',\n\t\t\tthis.sheetProg', '');
	one('if (this.baseSamples.length < fluid.capacity * 4) {', 'const capacity = fluid.capacity + sim.sheets.vertices.length / 3;\n\t\t\tif (this.baseSamples.length < capacity * 4) {');
	one('this.baseSamples = new Float32Array(fluid.capacity * 4);', 'this.baseSamples = new Float32Array(capacity * 4);');
	one('this.baseKernels = new Float32Array(fluid.capacity * 9);', 'this.baseKernels = new Float32Array(capacity * 9);');
	one('this.volumeExtent[1] = scale * 0.65;', 'this.volumeExtent[1] = Math.max(fluid.volumeExtent[1], Math.ceil((sim.sheets.maxHeight / scale + 0.4) * 4) * scale / 4);');
	one('\t\t\tif (this.baseCount === 0 && !this.volumeWarmed) {', `\t\t\t// Surface-area quadrature gives a thin lamella one normalized density field,
\t\t\t// including its rounded rim and its smooth union with the reservoir.
\t\t\tconst sheets = sim.sheets, support = fluid.smoothingRadius;
\t\t\tconst areaScale = 6 / (Math.PI * support * support);
\t\t\tfor (let i = 0; i < sheets.areas.length; i++) {
\t\t\t\tconst k = i * 3;
\t\t\t\tif (sheets.vertices[k + 1] <= sim.level + scale * 0.005 || sheets.areas[i] < scale * scale * 1e-7) continue;
\t\t\t\tconst sample = this.baseCount * 4, matrix = this.baseCount * 9;
\t\t\t\tthis.baseSamples.set(sheets.vertices.subarray(k, k + 3), sample);
\t\t\t\tthis.baseSamples[sample + 3] = Math.min(1.8, sheets.areas[i] * areaScale);
\t\t\t\tfor (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
\t\t\t\t\tthis.baseKernels[matrix + row * 3 + col] = (row === col ? 1 : 0) + (1 / 0.55 - 1) * sheets.normals[k + row] * sheets.normals[k + col];
\t\t\t\t}
\t\t\t\tthis.baseCount++;
\t\t\t}
\t\t\tif (this.baseCount === 0 && !this.volumeWarmed) {`);
	one('if (fluid.capacity > this.fluidCapacity) {', 'if (capacity > this.fluidCapacity) {');
	one('this.fluidCapacity = fluid.capacity;', 'this.fluidCapacity = capacity;');
	one('gl.bufferData(gl.ARRAY_BUFFER, fluid.capacity * 16, gl.DYNAMIC_DRAW);', 'gl.bufferData(gl.ARRAY_BUFFER, capacity * 16, gl.DYNAMIC_DRAW);');
	one('gl.bufferData(gl.ARRAY_BUFFER, fluid.capacity * 36, gl.DYNAMIC_DRAW);', 'gl.bufferData(gl.ARRAY_BUFFER, capacity * 36, gl.DYNAMIC_DRAW);');
	all('baseSamples', 'densitySamples'); all('baseKernels', 'densityKernels'); all('baseCount', 'sampleCount'); all('fluidCapacity', 'densityCapacity');
});
edit('src/lib/liquid2/shaders.ts', (_one, block) => {
	block('export const SHEET_VS =', 'export const SCREEN_VS =');
});
const archive = 'scratch/liquid2-review/before-unified-lamella';
mkdirSync(archive, { recursive: true });
for (const [path, source] of pending) {
	copyFileSync(path, `${archive}/${path.split('/').at(-1)}`);
	writeFileSync(path, source);
	console.log('updated', path);
}
