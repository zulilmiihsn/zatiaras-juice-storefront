import { readFileSync, writeFileSync } from 'node:fs';
const path = 'src/lib/liquid2/renderer.ts';
let source = readFileSync(path, 'utf8');
writeFileSync('scratch/liquid2-review/renderer-before-uniform-cache.ts', source);
source = source.replace(/\bgl\.uniform(1i|1f|2f|3f|4f|3fv)\(/g, 'this.uniform$1(');
source = source.replace('\tprivate readonly imageTexture: WebGLTexture;', '\tprivate readonly imageTexture: WebGLTexture;\n\tprivate readonly uniformValues = new WeakMap<WebGLUniformLocation, Float64Array>();');
const anchor = '\tprivate volumeUniforms(';
if (!source.includes(anchor)) throw new Error('Missing uniform upload owner');
source = source.replace(anchor, `
\tprivate uniformChanged(location: WebGLUniformLocation | null, x: number, y = 0, z = 0, w = 0): location is WebGLUniformLocation {
\t\tif (location === null) return false;
\t\tlet previous = this.uniformValues.get(location);
\t\tif (previous && previous[0] === x && previous[1] === y && previous[2] === z && previous[3] === w) return false;
\t\tif (!previous) { previous = new Float64Array(4); this.uniformValues.set(location, previous); }
\t\tprevious[0] = x; previous[1] = y; previous[2] = z; previous[3] = w;
\t\treturn true;
\t}
\tprivate uniform1i(location: WebGLUniformLocation | null, x: number) { if (this.uniformChanged(location, x)) this.gl.uniform1i(location, x); }
\tprivate uniform1f(location: WebGLUniformLocation | null, x: number) { if (this.uniformChanged(location, x)) this.gl.uniform1f(location, x); }
\tprivate uniform2f(location: WebGLUniformLocation | null, x: number, y: number) { if (this.uniformChanged(location, x, y)) this.gl.uniform2f(location, x, y); }
\tprivate uniform3f(location: WebGLUniformLocation | null, x: number, y: number, z: number) { if (this.uniformChanged(location, x, y, z)) this.gl.uniform3f(location, x, y, z); }
\tprivate uniform4f(location: WebGLUniformLocation | null, x: number, y: number, z: number, w: number) { if (this.uniformChanged(location, x, y, z, w)) this.gl.uniform4f(location, x, y, z, w); }
\tprivate uniform3fv(location: WebGLUniformLocation | null, values: ArrayLike<number>) { this.uniform3f(location, values[0], values[1], values[2]); }

` + anchor);
if (source.includes('this.this.')) throw new Error('Invalid uniform owner');
writeFileSync(path, source);
