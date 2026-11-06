import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const path='src/lib/liquid2/renderer.ts';
let s=readFileSync(path,'utf8');
copyFileSync(path,'scratch/liquid2-review/before-volume/cpu-density-renderer.ts');
s=s.replace('COMPOSITE_FS\n', 'COMPOSITE_FS, DENSITY_VS, DENSITY_FS, DENSITY_TILES, DENSITY_SLICES\n');
assert.ok(s.includes('DENSITY_VS'));
s=s.replace('private readonly compositeU;', 'private readonly compositeU;\nprivate readonly densityU;');
s=s.replace("private volumeTexture: WebGLTexture | null = null;\n\tprivate volumeKey = '';", "private densityTarget: DepthTarget | null = null;\nprivate densityKey='';\nprivate densityWidth=0; private densityHeight=0; private kernelScale=1;\nprivate heightTexture: WebGLTexture | null=null; private heightKey='';");
s=s.replace('private readonly compositeProg: WebGLProgram', 'private readonly compositeProg: WebGLProgram,\nprivate readonly densityProg: WebGLProgram');
const volumeNames="'uVolume', 'uVolumeOrigin', 'uVolumeExtent', 'uVolumeResolution', 'uAtlasSize', 'uDensityScale', 'uHeight', 'uHeightDomain', 'uSupport'";
s=s.replace(/this\.fluidU = locations\([\s\S]*?\] as const\);/,`this.fluidU=locations(gl,fluidProg,[...COMMON_UNIFORMS,'uSolidCylinder','uSolidBase','uSolidBottom',${volumeNames}] as const);`);
s=s.replace(/this\.compositeU = locations\([\s\S]*?\] as const\);/,`this.compositeU=locations(gl,compositeProg,[...COMMON_UNIFORMS,'uDepth','uDepthSize','uVolumeActive',${volumeNames}] as const);
this.densityU=locations(gl,densityProg,['uVolumeOrigin','uVolumeExtent','uVolumeResolution','uAtlasSize','uSupport','uKernelScale'] as const);`);
s=s.replace('gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 32, 0);','gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 16, 0);');
s=s.replace('gl.vertexAttribDivisor(2, 1);','gl.vertexAttribDivisor(2, DENSITY_SLICES);');
s=s.replace(/gl\.enableVertexAttribArray\(3\);[\s\S]*?gl\.vertexAttribDivisor\(3, 1\);/,'gl.disableVertexAttribArray(3);');
s=s.replace('program(gl, SCREEN_VS, COMPOSITE_FS)','program(gl, SCREEN_VS, COMPOSITE_FS), program(gl,DENSITY_VS,DENSITY_FS)');
s=s.replace(/programs\[4\](\s*\))/,'programs[4],programs[5]$1');
s=s.replace('withDepth: boolean): DepthTarget','withDepth: boolean, floating=false): DepthTarget');
const target=s.indexOf('private createTarget('), targetEnd=s.indexOf('private disposeTargets(',target);
assert.ok(target>0&&targetEnd>target);
let create=s.slice(target,targetEnd).replace('gl.RGBA8','floating ? gl.RGBA16F : gl.RGBA8').replace('gl.UNSIGNED_BYTE','floating ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE');
s=s.slice(0,target)+create+s.slice(targetEnd);
const start=s.indexOf('\n\tprivate uploadVolume('),end=s.indexOf('\n\tprivate common(',start);
assert.ok(start>0&&end>start);
s=s.slice(0,start)+`
private prepareVolume(sim: LiquidSim): boolean {
const gl=this.gl,fluid=sim.fluid;
const [nx,ny,nz]=fluid.volumeResolution;
const width=nx*DENSITY_TILES,height=ny*Math.ceil(nz/DENSITY_TILES),key=fluid.volumeResolution.join('x');
try{
if(!this.densityTarget||key!==this.densityKey){
if(this.densityTarget)this.disposeTargets([this.densityTarget]);
const floating=!!gl.getExtension('EXT_color_buffer_float');
try{this.densityTarget=this.createTarget(width,height,false,floating);this.kernelScale=floating?1:0.25;}
catch(error){if(!floating)throw error;for(let i=0;i<8&&gl.getError()!==gl.NO_ERROR;i++){}this.densityTarget=this.createTarget(width,height,false);this.kernelScale=0.25;}
this.densityWidth=width;this.densityHeight=height;this.densityKey=key;
gl.bindTexture(gl.TEXTURE_2D,this.densityTarget.texture);
gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
}
if(!this.heightTexture){this.heightTexture=gl.createTexture();if(!this.heightTexture)return false;gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,this.heightTexture);
gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);}
gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,this.heightTexture);
const heightKey=sim.field.cols+'x'+sim.field.rows;
if(heightKey!==this.heightKey){gl.texImage2D(gl.TEXTURE_2D,0,gl.R16F,sim.field.cols,sim.field.rows,0,gl.RED,gl.FLOAT,this.heights);this.heightKey=heightKey;}
else gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,sim.field.cols,sim.field.rows,gl.RED,gl.FLOAT,this.heights);
if(fluid.renderCount>0){
gl.bindFramebuffer(gl.FRAMEBUFFER,this.densityTarget.framebuffer);gl.viewport(0,0,width,height);gl.disable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendEquation(gl.FUNC_ADD);gl.blendFunc(gl.ONE,gl.ONE);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
gl.useProgram(this.densityProg);gl.uniform3fv(this.densityU.uVolumeOrigin,fluid.volumeOrigin);gl.uniform3fv(this.densityU.uVolumeExtent,fluid.volumeExtent);gl.uniform3f(this.densityU.uVolumeResolution,...fluid.volumeResolution);gl.uniform2f(this.densityU.uAtlasSize,width,height);gl.uniform1f(this.densityU.uSupport,fluid.smoothingRadius);gl.uniform1f(this.densityU.uKernelScale,this.kernelScale);
gl.bindVertexArray(this.fluidVao);gl.bindBuffer(gl.ARRAY_BUFFER,this.fluidBuffer);
if(fluid.capacity>this.fluidCapacity){this.fluidCapacity=fluid.capacity;gl.bufferData(gl.ARRAY_BUFFER,fluid.capacity*16,gl.DYNAMIC_DRAW);}
gl.bufferSubData(gl.ARRAY_BUFFER,0,fluid.densitySamples.subarray(0,fluid.renderCount*4));
gl.drawArraysInstanced(gl.TRIANGLE_STRIP,0,4,fluid.renderCount*DENSITY_SLICES);
}
gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,this.densityTarget.texture);
gl.bindFramebuffer(gl.FRAMEBUFFER,this.targets[0].framebuffer);gl.viewport(0,0,this.targetWidth,this.targetHeight);gl.enable(gl.DEPTH_TEST);gl.disable(gl.BLEND);gl.bindVertexArray(null);
return true;
}catch(error){console.warn('[liquid2] density reconstruction unavailable',error);return false;}
}
private volumeUniforms(u:Record<'uVolume'|'uVolumeOrigin'|'uVolumeExtent'|'uVolumeResolution'|'uAtlasSize'|'uDensityScale'|'uHeight'|'uHeightDomain'|'uSupport',WebGLUniformLocation|null>,fluid:Fluid,sim:LiquidSim){
const gl=this.gl;
gl.uniform1i(u.uVolume,2);gl.uniform1i(u.uHeight,3);gl.uniform3fv(u.uVolumeOrigin,fluid.volumeOrigin);gl.uniform3fv(u.uVolumeExtent,fluid.volumeExtent);gl.uniform3f(u.uVolumeResolution,...fluid.volumeResolution);gl.uniform2f(u.uAtlasSize,this.densityWidth,this.densityHeight);gl.uniform1f(u.uDensityScale,1/this.kernelScale);gl.uniform1f(u.uSupport,fluid.smoothingRadius);
const d=sim.field.domain;gl.uniform4f(u.uHeightDomain,d.x0,d.z0,d.x1-d.x0,d.z1-d.z0);
}
`+s.slice(end);
s=s.replace('if (fluid.renderCount > 0) fluid.reconstruct(sim.field);','');
s=s.replace('this.uploadVolume(fluid)','this.prepareVolume(sim)');
s=s.replaceAll('this.volumeUniforms(this.fluidU, fluid);','this.volumeUniforms(this.fluidU, fluid, sim);').replaceAll('this.volumeUniforms(this.compositeU, fluid);','this.volumeUniforms(this.compositeU, fluid, sim);');
s=s.replace('gl.deleteTexture(this.volumeTexture);','gl.deleteTexture(this.heightTexture); if(this.densityTarget)this.disposeTargets([this.densityTarget]);');
s=s.replace('this.compositeProg\n','this.compositeProg, this.densityProg\n');
writeFileSync(path,s);
