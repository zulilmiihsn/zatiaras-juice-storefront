import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const paths = ['src/lib/liquid2/fluid.ts', 'src/lib/liquid2/fluid.test.ts'];
const previous = paths.map(path => readFileSync(path, 'utf8').replaceAll('\r\n', '\n'));
let source = previous[0];
function cut(start, end, replacement = '') {
	const a = source.indexOf(start), b = source.indexOf(end, a + start.length);
	if (a < 0 || b < 0) throw new Error(`Missing ${start}`);
	source = source.slice(0, a) + replacement + source.slice(b);
}
cut('// Principal directions of a local parcel neighbourhood.', '// Integral of the poly6 kernel');
for (const field of ['densityKernels', 'kernels']) {
	source = source.replace(new RegExp(`^\\t(?:private )?readonly ${field}: Float32Array;\\n`, 'm'), '');
	source = source.replace(new RegExp(`^\\t\\tthis.${field} = new Float32Array\\([^\\n]+\\n`, 'm'), '');
}
source = source.replace(/^\tprivate readonly (?:covariance|basis) = new Float64Array\(9\);\n/gm, '');
source = source.replace('\t\tthis.reconstructKernels();\n', '');
cut('\tprivate reconstructKernels() {', '\tprivate collide(');
cut('\t\t\t\tconst a = i * 9,\n\t\t\t\t\ttransform = this.kernels;', '\t\t\t\tsurfaceDensity +=', '\t\t\t\tconst surfaceKernel = Math.max(0, 1 - r2 * inverseSurfaceSupport2);\n');
cut('\t\t\t\tconst a = i * 9,\n\t\t\t\t\tb = j * 9,', '\t\t\t\t\tthis.connected[j] = 1;', '\t\t\t\tif (!this.connected[j] && dx * dx + dy * dy + dz * dz < 1.44 * this.surfaceSupport * this.surfaceSupport) {\n');
source = source.replace(/\t\t\tfor \(let j = 0; j < 9; j\+\+\)\n\t\t\t\tthis.densityKernels[^\n]+\n/, '');
if (/this\.(kernels|covariance|basis|densityKernels)|kernelShape/.test(source)) throw new Error('Incomplete core reconstruction cleanup');
let tests = previous[1];
const start = tests.indexOf('\tit.each('), end = tests.indexOf("\tit('keeps a thin connected filament", start);
if (start < 0 || end < 0) throw new Error('Missing archived anisotropic-core experiment');
tests = tests.slice(0, start) + tests.slice(end);
mkdirSync('scratch/liquid2-review/core-anisotropy-archive', { recursive: true });
for (let i = 0; i < paths.length; i++) {
	writeFileSync(`scratch/liquid2-review/core-anisotropy-archive/${paths[i].split('/').at(-1)}`, previous[i]);
	writeFileSync(paths[i], i === 0 ? source : tests);
}
console.log('Core uses its volumetric kernel; film anisotropy remains in the shared reconstruction.');
