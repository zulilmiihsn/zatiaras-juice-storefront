import { readFileSync,writeFileSync,copyFileSync,mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const dir='src/lib/liquid2/';
mkdirSync('scratch/liquid2-review/retired-volume-prototypes',{recursive:true});
for(const file of ['fluid.ts','surface.ts','surface.test.ts','shaders.ts'])copyFileSync(dir+file,'scratch/liquid2-review/retired-volume-prototypes/'+file);
let fluid=readFileSync(dir+'fluid.ts','utf8');
fluid=fluid.replace('\n\treadonly renderData: Float32Array;','').replace('\n\treadonly density: Float32Array;','').replace('\n\tprivate readonly renderWeight: Float32Array;','');
fluid=fluid.replace(/\n\t\tthis\.renderData = new Float32Array\([^;]*;/,'').replace(/\n\t\tthis\.density = new Float32Array\([\s\S]*?\);/,'').replace(/\n\t\tthis\.renderWeight = new Float32Array\([^;]*;/,'');
const counter=fluid.indexOf('\n\t\tthis.renderCount = 0;',fluid.indexOf('private prepareRender'));
const start=fluid.indexOf('\n\t\tfor (let i = 0; i < this.count; i++) {',counter);
const end=fluid.indexOf('\n\t\tconst scale = this.drink!.height;',start);
assert.ok(counter>0&&start>counter&&end>start);
fluid=fluid.slice(0,start)+`
for(let i=0;i<this.count;i++){
if(!this.connected[i]||this.neighbourCount[i]<3)continue;
const o=this.renderCount++*4;
this.densitySamples[o]=this.old[i*3]*(1-alpha)+this.position[i*3]*alpha;
this.densitySamples[o+1]=this.old[i*3+1]*(1-alpha)+this.position[i*3+1]*alpha;
this.densitySamples[o+2]=this.old[i*3+2]*(1-alpha)+this.position[i*3+2]*alpha;
this.densitySamples[o+3]=1/Math.max(this.particleDensity[i],this.restDensity*0.2);
highest=Math.max(highest,this.densitySamples[o+1]+this.h);
}
`+fluid.slice(end);
const cpu=fluid.indexOf('\n\treconstruct('),radius=fluid.indexOf('\n\tget smoothingRadius',cpu);
assert.ok(cpu>0&&radius>cpu);fluid=fluid.slice(0,cpu)+fluid.slice(radius);
const visible=fluid.indexOf('\n\tget visibleHeight');
assert.ok(visible>0);fluid=fluid.slice(0,visible)+`
/** Highest connected fluid-parcel centre above the reservoir. */
get visibleHeight():number{
let height=0;for(let i=0;i<this.renderCount;i++)height=Math.max(height,this.densitySamples[i*4+1]-this.level);return height;
}
}\n`;
writeFileSync(dir+'fluid.ts',fluid);
let surface=readFileSync(dir+'surface.ts','utf8');
surface=surface.replace('(centre + 1) * 6','(centre + 1) * 3');
const build=surface.indexOf('export function buildSurfaceMesh');assert.ok(build>0);
surface=surface.slice(0,build)+`export function buildSurfaceMesh(sim:LiquidSim,grid:SurfaceGrid,heights:Float32Array){
sim.field.renderHeights(heights);const x0=sim.drink?.x??0,z0=sim.drink?.z??0;
for(let j=0;j<grid.rows;j++)for(let i=0;i<grid.cols;i++){
const o=(j*grid.cols+i)*3,x=x0+grid.radii[j]*grid.cos[i],z=z0+grid.radii[j]*grid.sin[i];
grid.data[o]=x;grid.data[o+1]=sim.level+sample(sim,heights,x,z);grid.data[o+2]=z;
}
const centre=grid.rows*grid.cols*3;grid.data[centre]=x0;grid.data[centre+1]=sim.level;grid.data[centre+2]=z0;
}\n`;
writeFileSync(dir+'surface.ts',surface);
copyFileSync('scratch/liquid2-review/final-reservoir.test.next.ts',dir+'surface.test.ts');
let renderer=readFileSync(dir+'renderer.ts','utf8');
renderer=renderer.replace('gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);','gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 12, 0);');
renderer=renderer.replace(/gl\.enableVertexAttribArray\(1\);\s*gl\.vertexAttribPointer\(1, 3, gl\.FLOAT, false, 24, 12\);/,'gl.disableVertexAttribArray(1);');
writeFileSync(dir+'renderer.ts',renderer);
let shader=readFileSync(dir+'shaders.ts','utf8');
const fs=shader.indexOf('export const SURFACE_FS ='),drink=shader.indexOf('// The drink photo',fs);assert.ok(fs>0&&drink>fs);shader=shader.slice(0,fs)+shader.slice(drink);
const old=shader.indexOf('export const FLUID_VS ='),screen=shader.indexOf('export const SCREEN_VS =',old);assert.ok(old>0&&screen>old);shader=shader.slice(0,old)+shader.slice(screen);
shader=shader.replace('layout(location = 1) in vec3 aNormal;','').replace('out vec3 vWorld, vNormal;','out vec3 vWorld;').replace('out float vHeight;','').replace('\tvNormal = aNormal;','').replace('\tvHeight = aPos.y - uLevel;','');
writeFileSync(dir+'shaders.ts',shader);
