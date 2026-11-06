import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const path = 'src/lib/liquid2/renderer.ts';
let source = readFileSync(path, 'utf8');
copyFileSync(path, 'scratch/liquid2-review/before-volume/ellipsoid-renderer.ts');
source = source.replace('FLUID_VS,', 'VOLUME_FS,').replace('FLUID_FS,', '');
assert.ok(source.includes('program(gl, FLUID_VS, FLUID_FS)'));
source = source.replace('program(gl, FLUID_VS, FLUID_FS)', 'program(gl, SCREEN_VS, VOLUME_FS)');
source = source.replace("import type { LiquidSim } from './sim';", "import type { LiquidSim } from './sim';\nimport type { Fluid } from './fluid';");
source = source.replace('private imageAspect = 0;', "private imageAspect = 0;\nprivate volumeTexture: WebGLTexture | null = null;\nprivate volumeKey = '';");
source = source.replace(/this\.fluidU = locations\([\s\S]*?\] as const\);/, "this.fluidU = locations(gl, fluidProg, [...COMMON_UNIFORMS, 'uSolidCylinder', 'uSolidBase', 'uSolidBottom', 'uVolume', 'uVolumeOrigin', 'uVolumeExtent', 'uVolumeResolution'] as const);");
source = source.replace(/this\.compositeU = locations\([\s\S]*?\] as const\);/, "this.compositeU = locations(gl, compositeProg, [...COMMON_UNIFORMS, 'uDepth', 'uDepthSize', 'uVolume', 'uVolumeOrigin', 'uVolumeExtent', 'uVolumeResolution', 'uVolumeActive'] as const);");
const start = source.indexOf('\n\t\tconst fluid = sim.fluid;');
const end = source.indexOf('\n\t\tgl.disable(gl.DEPTH_TEST);', start);
assert.ok(start > 0 && end > start);
source = source.slice(0, start) + `
const fluid = sim.fluid;
if(fluid.renderCount > 0) fluid.reconstruct(sim.field);
if(!this.uploadVolume(fluid)) { gl.bindFramebuffer(gl.FRAMEBUFFER,null); return false; }
if(!full && fluid.renderCount > 0) {
gl.useProgram(this.fluidProg); this.common(this.fluidU,cam,sim,time,cover);
gl.uniform2f(this.fluidU.uRes,this.targetWidth,this.targetHeight);
this.volumeUniforms(this.fluidU,fluid);
const solid=sim.field.obstacle;
gl.uniform4f(this.fluidU.uSolidCylinder,solid?.x??0,solid?.z??0,solid?.radius??0,solid?solid.baseY+solid.height:0);
gl.uniform1f(this.fluidU.uSolidBase,solid?.baseY??0);
gl.uniform1f(this.fluidU.uSolidBottom,solid?.baseRadius??solid?.radius??0);
gl.bindVertexArray(null); gl.drawArrays(gl.TRIANGLES,0,3);
}
` + source.slice(end);
source = source.replace('for (let pass = 0; pass < 4; pass++)', 'for (let pass = 0; pass < 2; pass++)');
source = source.replace('this.common(this.compositeU, cam, sim, time, cover);', `this.common(this.compositeU, cam, sim, time, cover);
this.volumeUniforms(this.compositeU,fluid);
gl.uniform1f(this.compositeU.uVolumeActive,fluid.renderCount>0?1:0);`);
source = source.replace(/(gl\.disable\(gl\.BLEND\);\s*gl\.bindVertexArray\(null\);)\s*\}/, '$1\nreturn true;\n}');
const common = source.indexOf('\n\tprivate common(');
assert.ok(common > 0);
source = source.slice(0, common) + `
private uploadVolume(fluid: Fluid): boolean {
const gl=this.gl;
if(!this.volumeTexture) {
this.volumeTexture=gl.createTexture(); if(!this.volumeTexture)return false;
gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_3D,this.volumeTexture);
gl.texParameteri(gl.TEXTURE_3D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
gl.texParameteri(gl.TEXTURE_3D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
for(const axis of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T,gl.TEXTURE_WRAP_R]) gl.texParameteri(gl.TEXTURE_3D,axis,gl.CLAMP_TO_EDGE);
}
gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_3D,this.volumeTexture);
const [x,y,z]=fluid.volumeResolution, key=fluid.volumeResolution.join('x');
if(key!==this.volumeKey){
gl.texImage3D(gl.TEXTURE_3D,0,gl.R16F,x,y,z,0,gl.RED,gl.FLOAT,fluid.density);
if(gl.getError()!==gl.NO_ERROR)return false;
this.volumeKey=key;
} else if(fluid.renderCount>0) gl.texSubImage3D(gl.TEXTURE_3D,0,0,0,0,x,y,z,gl.RED,gl.FLOAT,fluid.density);
return true;
}
private volumeUniforms(u: Record<'uVolume'|'uVolumeOrigin'|'uVolumeExtent'|'uVolumeResolution',WebGLUniformLocation|null>,fluid: Fluid){
const gl=this.gl;
gl.uniform1i(u.uVolume,2); gl.uniform3fv(u.uVolumeOrigin,fluid.volumeOrigin); gl.uniform3fv(u.uVolumeExtent,fluid.volumeExtent); gl.uniform3f(u.uVolumeResolution,...fluid.volumeResolution);
}
` + source.slice(common);
source = source.replace('gl.deleteTexture(this.imageTexture);', 'gl.deleteTexture(this.imageTexture); gl.deleteTexture(this.volumeTexture);');
writeFileSync(path,source);
