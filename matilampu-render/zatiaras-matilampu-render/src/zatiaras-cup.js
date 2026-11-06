// Zatiaras Cup Kit — cup resmi Zatiaras (jangan dibuat ulang; pakai modul ini apa adanya).
// Pemakaian: import { setupStudio, makeCup, loadDecal, FRESHJ } from './zatiaras-cup.js';
//   const studio = setupStudio(renderer, scene);   // env magenta + lampu + penangkap bayangan
//   await loadDecal('logo.png');                   // cetak logo oranye di cup
//   const cup = makeCup(FRESHJ); scene.add(cup.g); // cup.jm.userData.u.uBrown.value: 0 segar -> 1 cokelat
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
const C = h => new THREE.Color(h);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const lerp = (a, b, t) => a + (b - a) * t;
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function ctex(c, srgb = true) { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }

export function setupStudio(renderer, scene) {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
// Lingkungan pantulan: ruang magenta dengan softbox putih (pantulan kaca & logam ikut nuansa brand)
{
  const env = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.BoxGeometry(30, 20, 30), new THREE.MeshBasicMaterial({ color: C('#ff1081').multiplyScalar(0.32), side: THREE.BackSide }));
  env.add(room);
  const panel = (w, h, pos, rot, k) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k, k), side: THREE.DoubleSide })); m.position.copy(pos); m.rotation.set(rot[0], rot[1], rot[2]); env.add(m); };
  panel(10, 10, V(0, 9.5, 0), [Math.PI / 2, 0, 0], 3.2);
  panel(4, 9, V(-14.5, 2, 2), [0, Math.PI / 2, 0], 5);
  panel(2, 10, V(14.5, 1, -2), [0, -Math.PI / 2, 0], 4);
  panel(8, 3, V(0, 3, -14.5), [0, 0, 0], 2.4);
  panel(6, 2.2, V(3, 2, 14.5), [0, Math.PI, 0], 1.6);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshBasicMaterial({ color: C('#ff1081').multiplyScalar(0.8) }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -9.9; env.add(floor);
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(env, 0.02).texture;
}
const key = new THREE.DirectionalLight(0xffffff, 2.4);
key.position.set(3.2, 7.5, 4.6);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 22 });
key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
const rim = new THREE.DirectionalLight(0xfff0f6, 2.0); rim.position.set(-4.5, 4, -6);
const hemi = new THREE.HemisphereLight(0xfff4f8, 0xff6aa8, 0.32);
const cool = new THREE.PointLight(0x8fd3ff, 0, 5, 1.5); cool.position.set(1.4, 1.6, 1.4);
scene.add(key, key.target, rim, hemi, cool);

  const catcher = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ color: C('#5c0030'), opacity: 0.3 }));
  catcher.rotation.x = -Math.PI / 2; catcher.receiveShadow = true; scene.add(catcher);
  return { key, rim, hemi, catcher };
}

export function juiceMat(fresh = '#f1da4c', brown = '#93501b', h0 = 0.14, h1 = 1.2) {
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.35, clearcoat: 0.3, clearcoatRoughness: 0.25, envMapIntensity: 0.45, sheen: 0.12, sheenColor: C('#fff4c8'), sheenRoughness: 0.5, side: THREE.DoubleSide });
  m.userData.u = { uBrown: { value: 0 }, uF: { value: C(fresh) }, uBr: { value: C(brown) }, uH0: { value: h0 }, uH1: { value: h1 } };
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, m.userData.u);
    sh.vertexShader = 'varying float vH;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvH = position.y;');
    sh.fragmentShader = 'varying float vH; uniform float uBrown, uH0, uH1; uniform vec3 uF, uBr;\n' + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      { float h = clamp((vH - uH0) / (uH1 - uH0), 0.0, 1.0);
        float k = clamp(uBrown * 1.4 - (1.0 - h) * 0.5, 0.0, 1.0); k = k * k * (3.0 - 2.0 * k);
        diffuseColor.rgb = mix(uF, uBr, k); }`).replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * 0.28;');
  };
  return m;
}
const glassMat = () => new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.03, transmission: 1, thickness: 0.1, ior: 1.5, specularIntensity: 1, envMapIntensity: 1.25, side: THREE.DoubleSide });

const rO = y => 0.30 + 0.20 * (y - 0.02) / 1.46, rI = y => rO(y) - 0.012;
const CUPPTS = [[0, 0], [0.285, 0], [0.298, 0.006], [0.3, 0.02], [0.5, 1.48], [0.512, 1.49], [0.506, 1.505], [0.492, 1.5], [rI(1.48), 1.48], [rI(0.02), 0.014], [0, 0.012]];
const cupGeo = new THREE.LatheGeometry(CUPPTS.map(p => new THREE.Vector2(p[0], p[1])), 72);
// tutup: bibir lebar di mulut cup, dinding tegak pendek, atap datar (sesuai foto produk)
const LIDPTS = [[0.505, 1.455], [0.552, 1.468], [0.562, 1.495], [0.556, 1.528], [0.51, 1.54], [0.48, 1.546], [0.476, 1.565], [0.472, 1.68], [0.462, 1.697], [0.44, 1.703], [0, 1.703]];
const lidGeo = new THREE.LatheGeometry(LIDPTS.map(p => new THREE.Vector2(p[0], p[1])), 72);
function juiceGeo(top, rf, mound, base = 0.016) {
  const pts = [new THREE.Vector2(0, base)];
  for (let i = 0; i <= 14; i++) { const y = lerp(base, top, i / 14); pts.push(new THREE.Vector2(rf(y) - 0.004, y)); }
  const R0 = rf(top) - 0.004;
  for (let i = 1; i <= 12; i++) { const a = i / 12 * Math.PI / 2; pts.push(new THREE.Vector2(R0 * Math.cos(a), top + mound * Math.pow(Math.sin(a), 0.6))); }
  return new THREE.LatheGeometry(pts, 64);
}
const decalCanvas = canvas(1024, 756);
const decalTex = ctex(decalCanvas[0]);
const decalMat = new THREE.MeshStandardMaterial({ map: decalTex, transparent: true, roughness: 0.4, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
const lidMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transmission: 1, thickness: 0.03, ior: 1.45, side: THREE.DoubleSide, envMapIntensity: 1.3 });
const redMat = new THREE.MeshPhysicalMaterial({ color: C('#e23a3a'), roughness: 0.3, clearcoat: 0.7 });
export function makeCup(fresh) {
  const g = new THREE.Group();
  const jm = juiceMat(fresh, '#93501b', 0.02, 1.63);
  const juice = new THREE.Mesh(juiceGeo(1.48, rI, 0.15), jm); juice.castShadow = true;
  const shell = new THREE.Mesh(cupGeo, glassMat());
  const lid = new THREE.Mesh(lidGeo, lidMat);
  const dec = new THREE.Mesh(new THREE.CylinderGeometry(rO(0.98) + 0.006, rO(0.5) + 0.006, 0.48, 48, 1, true, -0.82, 1.64), decalMat);
  dec.position.y = 0.74; dec.renderOrder = 5;
  // tonjolan bening lubang sedotan + sumbat merah (cakram + lidah) di tepi kanan atas
  const boss = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.08, 0.2, 24), lidMat); boss.position.set(0.41, 1.655, 0);
  const plug = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.072, 0.034, 28), redMat); plug.position.set(0.41, 1.772, 0);
  const tab = new THREE.Mesh(new RoundedBoxGeometry(0.085, 0.022, 0.08, 2, 0.01), redMat); tab.position.set(0.485, 1.785, 0); tab.rotation.z = 0.1;
  g.add(juice, shell, lid, dec, boss, plug, tab);
  return { g, jm };
}
export const FRESHJ = '#ece68c';

export function loadDecal(url = "logo.png") {
  return new Promise(res => {
    const img = new Image();
    img.onload = () => {
      const [c, x] = decalCanvas; x.clearRect(0, 0, c.width, c.height);
      x.drawImage(img, 0, 0, c.width, c.height);
      x.globalCompositeOperation = 'source-atop';
      const g = x.createLinearGradient(0, 0, 0, c.height); g.addColorStop(0, '#f9a63c'); g.addColorStop(1, '#ea5d26');
      x.globalAlpha = 0.74; x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
      x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
      decalTex.needsUpdate = true; res();
    };
    img.onerror = () => res(); img.src = url;
  });
}


