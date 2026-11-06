import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';

const root = 'src/lib/liquid2/';
let renderer = readFileSync(root + 'renderer.ts', 'utf8');
const split = renderer.indexOf('export class Liquid2Renderer');
assert.ok(split > 0);
let prefix = renderer.slice(0, split);
const shaders = /import \{[^;]*\} from '\.\/shaders';/s;
assert.ok(shaders.test(prefix));
prefix = prefix.replace(shaders, "import { DRINK_FS, DRINK_VS, SURFACE_VS, DEPTH_FS, FLUID_VS, FLUID_FS, SCREEN_VS, BLUR_FS, COMPOSITE_FS } from './shaders';");
renderer = prefix + readFileSync('scratch/liquid2-review/volume-renderer-class.next.ts', 'utf8');

let surface = readFileSync(root + 'surface.ts', 'utf8');
assert.ok(surface.includes('const cols = sim.runUp.segments;'));
surface = surface.replace('const cols = sim.runUp.segments;', 'const cols = sim.field.cols <= 64 ? 64 : 96;');
surface = surface.replace('radii: Float32Array;', 'radii: Float32Array;\n cos: Float32Array;\n sin: Float32Array;');
const ret = surface.indexOf('\n\treturn {');
assert.ok(ret > 0);
surface = surface.slice(0, ret) + surface.slice(ret).replace('return {', `return {
cos: Float32Array.from({length: cols}, (_,i) => Math.cos(i * Math.PI * 2 / cols)),
sin: Float32Array.from({length: cols}, (_,i) => Math.sin(i * Math.PI * 2 / cols)),`);
const build = surface.indexOf('export function buildSurfaceMesh');
assert.ok(build > 0);
surface = surface.slice(0, build) + `export function buildSurfaceMesh(sim: LiquidSim, grid: SurfaceGrid, heights: Float32Array) {
sim.field.renderHeights(heights);
const x0 = sim.drink?.x ?? 0, z0 = sim.drink?.z ?? 0;
for(let j=0; j<grid.rows; j++) for(let i=0; i<grid.cols; i++) {
const o=(j*grid.cols+i)*6;
const x=x0+grid.radii[j]*grid.cos[i], z=z0+grid.radii[j]*grid.sin[i];
grid.data[o]=x; grid.data[o+1]=sim.level+sample(sim,heights,x,z); grid.data[o+2]=z;
grid.data[o+3]=0; grid.data[o+4]=1; grid.data[o+5]=0;
}
const centre=grid.rows*grid.cols*6;
grid.data[centre]=x0; grid.data[centre+1]=sim.level; grid.data[centre+2]=z0;
grid.data[centre+3]=0; grid.data[centre+4]=1; grid.data[centre+5]=0;
}\n`;
mkdirSync('scratch/liquid2-review/before-volume', { recursive: true });
for (const file of ['renderer.ts', 'surface.ts', 'run-up.ts']) copyFileSync(root + file, 'scratch/liquid2-review/before-volume/' + file);
writeFileSync(root + 'renderer.ts', renderer);
writeFileSync(root + 'surface.ts', surface);
