// post.js — bloom + grading sinematik (aberasi kromatik tipis, vignette, grain, sedikit dingin di bayangan)
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
const Grade = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uVig: { value: .5 }, uAb: { value: .0035 }, uGrain: { value: .035 }, uCool: { value: .5 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: `varying vec2 vUv; uniform sampler2D tDiffuse; uniform float uTime,uVig,uAb,uGrain,uCool;
  void main(){ vec2 c=vUv-.5; float d=dot(c,c);
    vec3 col; col.r=texture2D(tDiffuse,vUv+c*d*uAb*6.).r; col.g=texture2D(tDiffuse,vUv).g; col.b=texture2D(tDiffuse,vUv-c*d*uAb*6.).b;
    float lum=dot(col,vec3(.299,.587,.114)); col=mix(col,col*vec3(.94,1.0,1.1),uCool*(1.-smoothstep(.1,.6,lum)));
    col*=1.-uVig*smoothstep(.12,.85,length(c*vec2(1.,.8))*1.5);
    float g=fract(sin(dot(vUv*vec2(1000.,1777.)+fract(uTime)*91.7,vec2(12.9898,78.233)))*43758.5453); col+=(g-.5)*uGrain;
    gl_FragColor=vec4(col,1.); }`,
};
export function makePost(renderer, scene, camera, w, h) {
  const rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: (new URLSearchParams(location.search).get('msaa') === '0') ? 0 : 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), .38, .5, 1.0); composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const grade = new ShaderPass(Grade); composer.addPass(grade);
  return { composer, bloom, grade, setSize(W, H) { composer.setSize(W, H); } };
}
