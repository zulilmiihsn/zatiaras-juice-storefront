// extras.js — detail 3D "Indonesia banget" + efek: kampung, rumah dengan kipas & lilin, motor matic, tiang PLN,
// laron, kerucut cahaya, langit malam, blender & buah di counter, neon BUKA. Semua animasi = fungsi waktu murni (aman untuk seek).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { paint, shutter, concrete, rep as repMat, steel, wood, plain } from './mat.js';
import { strawberry, mango, avocado, avocadoHalf, dragonFruit, dragonHalf, papaya, mangoCube, bananaSlice, centered } from './fruits.js';

const C = h => new THREE.Color(h), V = (x, y, z) => new THREE.Vector3(x, y, z);
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function ctex(w, h, draw, rep = [1, 1], srgb = true) { const [c, x] = cv(w, h); draw(x, w, h); const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); t.anisotropy = 8; return t; }

// ---------- tekstur prosedural ----------
export const texAsphalt = () => ctex(512, 512, (x, w, h) => {
  // aspal halus-realistis: butir agregat halus + variasi nada lembut, tanpa retak/noda
  const R = rng(5); x.fillStyle = '#4d4f53'; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 14000; i++) { const v = 78 + R() * 52 | 0; x.fillStyle = `rgba(${v},${v},${v + 3},${.22 + R() * .4})`; x.fillRect(R() * w, R() * h, 1 + R() * 1.8, 1 + R() * 1.8); }
  for (let i = 0; i < 700; i++) { x.fillStyle = `rgba(${R() < .5 ? '28,28,30' : '120,120,124'},${.1 + R() * .2})`; x.fillRect(R() * w, R() * h, 1, 1); }
  for (let i = 0; i < 5; i++) { x.fillStyle = 'rgba(0,0,0,.035)'; x.beginPath(); x.ellipse(R() * w, R() * h, 80 + R() * 90, 50 + R() * 70, R() * 3, 0, 7); x.fill(); }
}, [34, 34]);
export const texConcrete = () => ctex(512, 512, (x, w, h) => {
  // ubin/beton halaman depan: bersih, sambungan tipis
  const R = rng(8); x.fillStyle = '#bdbab2'; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 6000; i++) { const v = 170 + R() * 40 | 0; x.fillStyle = `rgba(${v},${v - 1},${v - 5},${.18 + R() * .3})`; x.fillRect(R() * w, R() * h, 1 + R() * 2, 1 + R() * 2); }
  x.strokeStyle = 'rgba(110,108,100,.55)'; x.lineWidth = 3; x.strokeRect(0, 0, w, h);
}, [15, 7.5]);
export const texWall = (base = '#eedf8f', dark = 'rgba(0,0,0,0)', seed = 21) => ctex(512, 512, (x, w, h) => {
  // cat dinding bersih: plester halus (orange-peel) tanpa noda/lumut
  const R = rng(seed); x.fillStyle = base; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 4500; i++) { x.fillStyle = `rgba(${R() < .5 ? '255,255,255' : '120,100,50'},${.015 + R() * .03})`; x.fillRect(R() * w, R() * h, 2 + R() * 5, 2 + R() * 5); }
  const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,255,255,.03)'); g.addColorStop(1, 'rgba(0,0,0,.04)'); x.fillStyle = g; x.fillRect(0, 0, w, h);
});
export const texRoof = () => ctex(256, 256, (x, w, h) => {
  // seng cat coklat bersih: gelombang halus, tanpa karat
  x.fillStyle = '#8f4f3a'; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 64; i++) { x.fillStyle = `rgba(${i % 2 ? '255,230,210' : '40,15,8'},.045)`; x.fillRect(i * 4, 0, 2, h); }
});
const texSky = () => ctex(2048, 1024, (x, w, h) => {
  const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#03060f'); g.addColorStop(.3, '#07102a'); g.addColorStop(.47, '#1a2b55'); g.addColorStop(.5, '#2e4272'); g.addColorStop(1, '#2e4272'); x.fillStyle = g; x.fillRect(0, 0, w, h);
  const R = rng(9); for (let i = 0; i < 620; i++) { const y = R() * h * .47, a = .25 + R() * .75, s = R() < .07 ? 2.6 : 1.3; x.fillStyle = `rgba(255,250,235,${a})`; x.fillRect(R() * w, y, s, s); }
  for (let i = 0; i < 16; i++) { x.fillStyle = 'rgba(70,90,130,.07)'; x.beginPath(); x.ellipse(R() * w, h * (.34 + R() * .14), 160 + R() * 260, 12 + R() * 26, 0, 0, 7); x.fill(); }
});
function glowTex() { const [c, x] = cv(128, 128); const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.18, 'rgba(255,255,255,.55)'); g.addColorStop(.5, 'rgba(255,255,255,.12)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); }

export async function buildExtras({ scene, renderer, K, IN }) {
  const R0 = rng(2026);
  const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .85, metalness: 0, ...o });
  const add = (m, p = scene) => { p.add(m); m.traverse(o => { if (o.isMesh) { o.castShadow = !o.userData.noCast; o.receiveShadow = true; } }); return m; };
  const box = (w, h, d, mat, x, y, z, p, r = 0) => { const m = new THREE.Mesh(r ? new RoundedBoxGeometry(w, h, d, 3, r) : new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return add(m, p); };
  const cyl = (rt, rb, h, mat, x, y, z, p, seg = 20) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.position.set(x, y, z); return add(m, p); };
  const ell = (rx, ry, rz, mat, x, y, z, p) => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 22, 16), mat); m.scale.set(rx, ry, rz); m.position.set(x, y, z); return add(m, p); };
  const noShadow = g => g.traverse(o => { if (o.isMesh) o.castShadow = false; });
  const gt = glowTex();
  const sprite = (color, size, pos, parent = scene) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: gt, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 })); s.scale.set(size, size, 1); s.position.copy(pos); parent.add(s); return s; };
  const wire = (a, b, sag, r = .012, col = 0x101215) => { const m = V((a.x + b.x) / 2, Math.min(a.y, b.y) - sag, (a.z + b.z) / 2); const c = new THREE.QuadraticBezierCurve3(a, m, b); const t = new THREE.Mesh(new THREE.TubeGeometry(c, 48, r, 5), M(col, { roughness: .6 })); t.castShadow = false; scene.add(t); return t; };

  // ================= langit malam + bulan =================
  const sky = new THREE.Mesh(new THREE.SphereGeometry(95, 48, 24), new THREE.MeshBasicMaterial({ map: texSky(), side: THREE.BackSide, transparent: true, opacity: 0, fog: false, depthWrite: false }));
  sky.renderOrder = -10; scene.add(sky);
  const moonPos = V(-8.5, 19, -46);
  const moonGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: gt, color: 0xbcd2ff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false, opacity: 0 })); moonGlow.position.copy(moonPos); moonGlow.scale.set(16, 16, 1); scene.add(moonGlow);
  const moon = new THREE.Mesh(new THREE.CircleGeometry(1.7, 48), new THREE.MeshBasicMaterial({ color: C(0xf3f6ff).multiplyScalar(2.4), fog: false, transparent: true, opacity: 0, depthWrite: false })); moon.position.copy(moonPos); moon.lookAt(0, 3, 36); scene.add(moon);

  // ================= rumah tetangga kiri: ruang dalam dengan kipas & lilin =================
  const house = new THREE.Group(); scene.add(house);
  const HX0 = -11.35, HX1 = -5.85, HZ0 = -3.2, HZ1 = 2.0, HH = 4.4, T = .25;
  const mint = M(0xffffff, { map: texWall('#b4dcc6', 'rgba(0,0,0,0)', 33), roughness: .95 });
  box(HX1 - HX0, HH, T, mint, (HX0 + HX1) / 2, HH / 2, HZ0 + T / 2, house);
  box(T, HH, HZ1 - HZ0, mint, HX0 + T / 2, HH / 2, (HZ0 + HZ1) / 2, house);
  box(T, HH, HZ1 - HZ0, mint, HX1 - T / 2, HH / 2, (HZ0 + HZ1) / 2, house);
  const ox0 = -7.6, ox1 = -6.1, oy0 = 1.45, oy1 = 2.85;
  box(ox0 - HX0, HH, T, mint, (HX0 + ox0) / 2, HH / 2, HZ1 - T / 2, house);
  box(HX1 - ox1, HH, T, mint, (ox1 + HX1) / 2, HH / 2, HZ1 - T / 2, house);
  box(ox1 - ox0, HH - oy1, T, mint, (ox0 + ox1) / 2, (HH + oy1) / 2, HZ1 - T / 2, house);
  box(ox1 - ox0, oy0, T, mint, (ox0 + ox1) / 2, oy0 / 2, HZ1 - T / 2, house);
  box(HX1 - HX0, .2, HZ1 - HZ0, M(0xb9b4a8, { roughness: .8 }), (HX0 + HX1) / 2, .1, (HZ0 + HZ1) / 2, house);
  box(HX1 - HX0 - .4, .12, HZ1 - HZ0 - .4, M(0xf1ede2), (HX0 + HX1) / 2, 3.7, (HZ0 + HZ1) / 2, house);
  box(HX1 - HX0 + .8, .16, HZ1 - HZ0 + 1.0, M(0xffffff, { map: texRoof(), roughness: .55, metalness: .4 }), (HX0 + HX1) / 2, HH + .08, (HZ0 + HZ1) / 2 + .3, house);
  // jendela lain (panel menyala)
  const hwin = M(0x3a444d, { roughness: .15, emissive: 0xffd58a, emissiveIntensity: 0 });
  [-9.0, -10.6].forEach(x => { box(.95, 1.0, .04, hwin, x, 2.15, HZ1 + .02, house); box(1.05, .06, .06, M(0xb7bdc4, { metalness: .6 }), x, 1.62, HZ1 + .05, house); });
  // bukaan: kusen, kaca, teralis, gorden
  const alu = M(0xb7bdc4, { metalness: .7, roughness: .35 });
  box(.06, oy1 - oy0, .08, alu, ox0, (oy0 + oy1) / 2, HZ1 - .02, house); box(.06, oy1 - oy0, .08, alu, ox1, (oy0 + oy1) / 2, HZ1 - .02, house);
  box(ox1 - ox0, .06, .08, alu, (ox0 + ox1) / 2, oy1, HZ1 - .02, house); box(ox1 - ox0, .06, .08, alu, (ox0 + ox1) / 2, oy0, HZ1 - .02, house);
  const gl = new THREE.Mesh(new THREE.PlaneGeometry(ox1 - ox0, oy1 - oy0), new THREE.MeshStandardMaterial({ color: 0xcfe8f2, roughness: .05, transparent: true, opacity: .1, depthWrite: false })); gl.position.set((ox0 + ox1) / 2, (oy0 + oy1) / 2, HZ1 - .05); house.add(gl);
  const curtT = ctex(128, 64, (x, w, h) => { for (let i = 0; i < 16; i++) { x.fillStyle = i % 2 ? '#2f8f8a' : '#3aa39d'; x.fillRect(i * 8, 0, 8, h); } });
  box(.42, 1.35, .04, M(0xffffff, { map: curtT, roughness: .95 }), ox0 + .24, 2.15, HZ1 - .3, house); box(.3, 1.35, .04, M(0xffffff, { map: curtT, roughness: .95 }), ox1 - .18, 2.15, HZ1 - .3, house);
  // isi ruang: rak jendela + lilin + blender rumah (listrik mati), jam, kalender, lampu plafon
  box(1.5, .04, .5, M(0xb08a5e, { roughness: .6 }), -6.85, 1.465, 1.6, house);
  cyl(.07, .07, .015, M(0xe9e5dc, { roughness: .4 }), -7.02, 1.49, 1.6, house, 20);
  cyl(.022, .022, .14, M(0xf5eed6, { roughness: .7 }), -7.02, 1.567, 1.6, house, 12);
  const flameMat = new THREE.MeshStandardMaterial({ color: 0xffb347, emissive: 0xffa030, emissiveIntensity: 0 });
  const flame = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), flameMat); flame.position.set(-7.02, 1.665, 1.6); flame.scale.set(.011, .0001, .011); house.add(flame);
  const candleLight = new THREE.PointLight(0xff9a40, 0, 5.5, 1.8); candleLight.position.set(-7.02, 1.74, 1.66); house.add(candleLight);
  const candleGlow = sprite(0xffa850, .5, V(-7.02, 1.67, 1.63), house);
  { const hb = new THREE.Group(); hb.position.set(-6.66, 1.485, 1.62); house.add(hb);
    box(.15, .09, .15, M(0xe8e8ea, { roughness: .4 }), 0, .045, 0, hb, .012);
    const jr = new THREE.Mesh(new THREE.CylinderGeometry(.07, .055, .22, 28, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xf4fbff, transparent: true, opacity: .22, roughness: .05, side: THREE.DoubleSide, depthWrite: false })); jr.position.y = .2; jr.renderOrder = 3; hb.add(jr);
    cyl(.075, .075, .025, M(0x25282d), 0, .322, 0, hb, 24);
    [[0, .12, .012, 0], [-.025, .13, -.02, 1], [.026, .12, -.012, 2], [-.012, .16, .02, 3], [.02, .165, 0, 4], [-.018, .2, -.012, 5], [.01, .21, .01, 6]].forEach(([x, y, z, k]) => { const o = k % 3 === 0 ? centered(strawberry(50 + k), .046) : k % 3 === 1 ? mangoCube(60 + k) : bananaSlice(70 + k); o.position.set(x, y, z); o.rotation.set(k, k * 1.3, k * .7); hb.add(o); });
    cyl(.012, .012, .03, M(0x25282d), .03, .07, .076, hb, 10).rotation.x = Math.PI / 2; }
  const roomBulb = new THREE.MeshStandardMaterial({ color: 0xfff4d6, emissive: 0xffe2a0, emissiveIntensity: 0 });
  const rb = new THREE.Mesh(new THREE.SphereGeometry(.09, 12, 10), roomBulb); rb.position.set(-7.0, 3.5, .3); house.add(rb);
  const roomLight = new THREE.PointLight(0xffe0a8, 0, 8, 1.6); roomLight.position.set(-7.0, 3.3, .5); house.add(roomLight);
  const clk = cyl(.22, .22, .04, M(0xf4f1e8), -8.2, 2.3, HZ0 + T + .03, house, 28); clk.rotation.x = Math.PI / 2;
  box(.34, .46, .02, M(0xe6e1d3), -9.0, 2.1, HZ0 + T + .02, house); box(.3, .1, .022, M(0xc8222c), -9.0, 2.27, HZ0 + T + .025, house);
  // kipas angin berdiri
  const fan = new THREE.Group(); fan.position.set(-6.95, .2, .75); house.add(fan);
  const fanMat = M(0xeeeeee, { roughness: .45 }), guardMat = M(0x9fa5ab, { metalness: .7, roughness: .35 });
  cyl(.22, .24, .05, fanMat, 0, .025, 0, fan, 28); cyl(.022, .022, 1.6, guardMat, 0, .85, 0, fan, 10);
  const head = new THREE.Group(); head.position.set(0, 1.85, 0); fan.add(head);
  const mot = cyl(.075, .075, .2, fanMat, 0, 0, -.06, head, 20); mot.rotation.x = Math.PI / 2;
  for (const r of [.05, .11, .18, .25, .3]) { const t = new THREE.Mesh(new THREE.TorusGeometry(r, .004, 6, 44), guardMat); t.position.z = .08; head.add(t); }
  const back = new THREE.Mesh(new THREE.TorusGeometry(.3, .004, 6, 44), guardMat); back.position.z = -.06; head.add(back);
  for (let i = 0; i < 14; i++) { const s = box(.3, .004, .004, guardMat, 0, 0, .08, head); s.geometry.translate(.15, 0, 0); s.position.set(0, 0, .08); s.rotation.z = i * Math.PI * 2 / 14; }
  const blades = new THREE.Group(); blades.position.z = .02; head.add(blades);
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0x8ec9e8, roughness: .4, transparent: true, opacity: .9, side: THREE.DoubleSide });
  for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.CircleGeometry(1, 24), bladeMat); b.scale.set(.075, .135, 1); b.position.y = .15; b.rotation.y = .45; const pv = new THREE.Group(); pv.rotation.z = i * Math.PI * 2 / 3; pv.add(b); blades.add(pv); }
  const hub = cyl(.03, .03, .05, fanMat, 0, 0, .04, head, 12); hub.rotation.x = Math.PI / 2;
  const [bc, bx] = cv(128, 128); const bg = bx.createRadialGradient(64, 64, 4, 64, 64, 64); bg.addColorStop(0, 'rgba(210,235,250,.5)'); bg.addColorStop(.8, 'rgba(210,235,250,.35)'); bg.addColorStop(1, 'rgba(210,235,250,0)'); bx.fillStyle = bg; bx.fillRect(0, 0, 128, 128);
  const blur = new THREE.Mesh(new THREE.CircleGeometry(.29, 32), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(bc), transparent: true, opacity: .3, depthWrite: false })); blur.position.z = .045; head.add(blur);
  // ---- pintu + teras rumah kiri ----
  { const WD = repMat(wood({ base: [150, 92, 48] }), .5, 1.2), fr = plain(0x4a2f1a, { roughness: .6 });
    box(1.1, 2.2, .06, fr, -10.2, 1.3, HZ1 + .03, house, .01); const dr = new THREE.Mesh(new THREE.PlaneGeometry(.92, 2.04), WD); dr.position.set(-10.2, 1.27, HZ1 + .065); house.add(dr);
    box(.03, .03, .05, steel(), -9.82, 1.25, HZ1 + .09, house, .01); box(1.7, .12, .75, repMat(concrete('#c9c6bd'), 2, 1), -10.2, .06, HZ1 + .4, house, .01); box(1.2, .1, .5, repMat(concrete('#c9c6bd'), 2, 1), -10.2, .17, HZ1 + .3, house, .01); }

  // ================= ruko kanan (tutup): rolling door, papan nama oranye, kusen =================
  { const g = new THREE.Group(); scene.add(g); const cx = 8.2, fz = 2.2;
    const wall = repMat(paint('#3d6fa8', 12, .85), 7, 5.2); box(5.5, 4.2, 5.6, M(0x3d6fa8, { roughness: .9 }), cx, 2.1, -.6, g);
    const fa = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 4.2), wall); fa.position.set(cx, 2.1, fz + .004); g.add(fa);
    const sd = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 4.2), repMat(paint('#3a669c', 13, .85), 7, 5.2)); sd.position.set(cx - 2.754, 2.1, -.6); sd.rotation.y = -Math.PI / 2; g.add(sd);
    box(3.7, 2.55, .12, repMat(concrete('#aeb2b6'), 4, 3), cx, 1.36, fz + .03, g, .01);
    const rd = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 2.3), repMat(shutter(), 5.5, 3.8)); rd.position.set(cx, 1.25, fz + .1); g.add(rd);
    box(3.5, .22, .22, repMat(steel(), 1, 1), cx, 2.52, fz + .14, g, .02); box(.1, .05, .06, plain(0x2a2e33), cx + .9, .3, fz + .13, g, .01);
    const sgT = (() => { const [c, x] = (() => { const c = document.createElement('canvas'); c.width = 512; c.height = 128; return [c, c.getContext('2d')]; })(); const gr = x.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, '#f08a2a'); gr.addColorStop(1, '#d9701a'); x.fillStyle = gr; x.fillRect(0, 0, 512, 128); x.fillStyle = 'rgba(255,255,255,.9)'; x.fillRect(24, 56, 464, 5); x.fillRect(24, 70, 300, 5); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    box(3.7, .85, .14, M(0xffffff, { map: sgT, roughness: .45 }), cx, 3.05, fz + .1, g, .02);
    [[-1.7, 3.7], [1.7, 3.7]].forEach(([dx, y]) => { box(.9, .8, .08, plain(0xdfe3e6, { roughness: .5 }), cx + dx, y, fz + .04, g, .01); box(.78, .68, .02, hwin, cx + dx, y, fz + .09, g); });
    box(5.7, .14, 5.8, repMat(concrete('#b8b6ae'), 4, 4), cx, 4.27, -.6, g, .01); box(5.5, .06, .08, plain(0xf2f2ee), cx, 4.18, fz + .04, g);
    cyl(.04, .04, 4.2, repMat(steel(), 1, 1), cx - 2.62, 2.1, fz + .09, g, 12); box(4.0, .12, .5, repMat(concrete('#c4c1b8'), 3, 1), cx, .14, fz + .3, g, .01); }

  // ================= kerb belang hitam-putih + marka jalan =================
  { const [c, x] = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 64; return [c, c.getContext('2d')]; })(); for (let i = 0; i < 4; i++) { x.fillStyle = i % 2 ? '#1c1d20' : '#ecece9'; x.fillRect(i * 64, 0, 64, 64); }
    const ct = new THREE.CanvasTexture(c); ct.colorSpace = THREE.SRGBColorSpace; ct.wrapS = THREE.RepeatWrapping; ct.repeat.set(30, 1);
    box(30, .18, .3, M(0xffffff, { map: ct, roughness: .75 }), 0, .09, 9.4, scene, .01);
    for (let i = -8; i <= 8; i++) box(2.2, .006, .16, M(0xf2f2ee, { roughness: .7 }), i * 4.5, .004, 16, scene); box(44, .006, .12, M(0xf2f2ee, { roughness: .7 }), 0, .004, 10.5, scene);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(.22, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), M(0x8d9298, { metalness: .6, roughness: .4 })); dome.scale.y = .5; dome.position.set(-2.75, 5.14, 7.5); scene.add(dome); }

  // ================= motor matic, kursi plastik =================
  function scooter(color, helmet) {
    const g = new THREE.Group(), body = M(color, { roughness: .32, metalness: .25 }), blk = M(0x16171a, { roughness: .6 }), chrome = M(0xb9bec4, { metalness: .85, roughness: .28 });
    const wheel = z => { const w = new THREE.Group(); const tire = new THREE.Mesh(new THREE.TorusGeometry(.2, .06, 10, 28), blk); tire.rotation.y = Math.PI / 2; w.add(tire); const rim = cyl(.16, .16, .09, chrome, 0, 0, 0, w, 20); rim.rotation.z = Math.PI / 2; w.position.set(0, .26, z); add(w, g); };
    wheel(.62); wheel(-.58);
    for (const sx of [-1, 1]) { const f = cyl(.014, .014, .78, chrome, sx * .08, .6, .55, g, 8); f.rotation.x = -.23; }
    box(.13, .03, .5, body, 0, .58, .66, g, .012).rotation.x = .2;
    box(.5, .78, .13, body, 0, .62, .34, g, .04).rotation.x = -.28;
    box(.5, .22, .3, body, 0, 1.03, .4, g, .06);
    const hl = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, .03, 16), new THREE.MeshStandardMaterial({ color: 0xdfe8ee, emissive: 0xfff0c8, emissiveIntensity: 0, roughness: .1 })); hl.rotation.x = Math.PI / 2; hl.position.set(0, 1.02, .56); g.add(hl); g.userData.hl = hl;
    const hb = cyl(.014, .014, .62, chrome, 0, 1.13, .36, g, 8); hb.rotation.z = Math.PI / 2;
    for (const sx of [-1, 1]) { cyl(.019, .019, .12, blk, sx * .3, 1.13, .36, g, 10).rotation.z = Math.PI / 2; cyl(.006, .006, .22, chrome, sx * .27, 1.24, .34, g, 6); ell(.05, .035, .01, chrome, sx * .27, 1.36, .34, g); }
    box(.44, .05, .5, blk, 0, .24, .06, g, .015);
    box(.36, .11, .62, blk, 0, .8, -.2, g, .04);
    box(.44, .3, .66, body, 0, .52, -.32, g, .06); box(.3, .15, .2, body, 0, .71, -.72, g, .04);
    g.userData.tail = new THREE.MeshStandardMaterial({ color: 0x8a1018, emissive: 0xff1010, emissiveIntensity: 0 }); box(.2, .05, .03, g.userData.tail, 0, .68, -.83, g);
    cyl(.04, .04, .5, chrome, .2, .3, -.4, g, 12).rotation.x = Math.PI / 2;
    const hm = new THREE.Mesh(new THREE.SphereGeometry(.13, 18, 12, 0, Math.PI * 2, 0, Math.PI * .85), M(helmet, { roughness: .3, metalness: .1 })); hm.position.set(.16, 1.27, .3); hm.rotation.x = -.15; add(hm, g);
    return g;
  }
  const scooters = [[0x16171a, 0xe8e8e8, -2.0, 4.6, .5], [0xb82a2f, 0x22262b, -0.1, 5.2, -.45], [0x1f5fae, 0xf2f2f2, -4.9, 5.6, .9]].map(([c, h, x, z, r]) => { const s = scooter(c, h); s.position.set(x, 0, z); s.rotation.y = r; scene.add(s); return s; });
  // ================= kios: neon BUKA, lampu teras, panel genset, rak, keranjang rotan, buah, blender =================
  const neonTex = ctex(512, 256, (x, w, h) => {
    x.fillStyle = '#0d0f14'; x.beginPath(); x.roundRect(8, 8, w - 16, h - 16, 28); x.fill();
    x.lineWidth = 7; x.strokeStyle = '#26a8ff'; x.shadowColor = '#26a8ff'; x.shadowBlur = 16; x.beginPath(); x.roundRect(24, 24, w - 48, h - 48, 20); x.stroke();
    x.font = '900 118px Impact, "Arial Black", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#ff4d66'; x.shadowColor = '#ff2a4a'; x.shadowBlur = 20; x.fillText('BUKA', w / 2, h / 2 + 6); x.fillText('BUKA', w / 2, h / 2 + 6);
  });
  const neonMat = new THREE.MeshStandardMaterial({ map: neonTex, emissiveMap: neonTex, emissive: 0xffffff, emissiveIntensity: 0, roughness: .6 });
  const neon = new THREE.Mesh(new THREE.PlaneGeometry(.44, .22), neonMat); neon.position.set(3.02, 1.72, 2.2); scene.add(neon);
  const neonGlow = sprite(0xff3a55, 1.1, V(3.02, 1.72, 2.16));
  // lampu teras
  const terasMat = new THREE.MeshStandardMaterial({ color: 0xfff1d0, emissive: 0xffe0a0, emissiveIntensity: 0 });
  cyl(.04, .05, .08, M(0x444a50), .3, 2.05, 2.38, scene, 10); const tb = new THREE.Mesh(new THREE.SphereGeometry(.07, 14, 10), terasMat); tb.position.set(.3, 1.96, 2.38); scene.add(tb);
  const terasLight = new THREE.PointLight(0xffd9a0, 0, 6.5, 1.6); terasLight.position.set(.3, 1.9, 2.8); scene.add(terasLight);
  const terasGlow = sprite(0xffd9a0, 1.0, V(.3, 1.96, 2.42));
  // panel genset di pilar kanan
  box(.22, .3, .1, M(0x8a9097, { metalness: .5, roughness: .45 }), 3.62, 1.15, 2.37, scene, .01); box(.16, .12, .02, M(0x1b1f24), 3.62, 1.2, 2.43, scene);
  const panelLedMat = new THREE.MeshStandardMaterial({ color: 0x41ff7a, emissive: 0x41ff7a, emissiveIntensity: 0 }); const pl = new THREE.Mesh(new THREE.SphereGeometry(.013, 8, 8), panelLedMat); pl.position.set(3.58, 1.1, 2.43); scene.add(pl);
  // kolam cahaya di halaman depan
  const [pc, px] = cv(128, 128); const pg = px.createRadialGradient(64, 64, 0, 64, 64, 64); pg.addColorStop(0, 'rgba(255,255,255,.9)'); pg.addColorStop(.6, 'rgba(255,255,255,.3)'); pg.addColorStop(1, 'rgba(255,255,255,0)'); px.fillStyle = pg; px.fillRect(0, 0, 128, 128);
  const poolMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(pc), color: 0xffc77a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(8, 5.2), poolMat); pool.rotation.x = -Math.PI / 2; pool.position.set(2.0, .095, 4.7); pool.renderOrder = 2; scene.add(pool);

  // ================= kerucut cahaya, glow, serangga =================
  function lightCone(origin, target, deg, color) {
    const len = origin.distanceTo(target), r = Math.tan(deg * Math.PI / 180) * len;
    const g = new THREE.ConeGeometry(r, len, 40, 1, true); g.translate(0, -len / 2, 0); g.rotateX(-Math.PI / 2);
    const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { uC: { value: C(color) }, uI: { value: 0 }, uLen: { value: len } },
      vertexShader: 'varying float vT; varying vec3 vN; varying vec3 vV; uniform float uLen; void main(){ vT=position.z/uLen; vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }',
      fragmentShader: 'varying float vT; varying vec3 vN; varying vec3 vV; uniform vec3 uC; uniform float uI; void main(){ float f=pow(abs(dot(normalize(vN),normalize(vV))),1.8); float a=uI*f*pow(1.-clamp(vT,0.,1.),1.3)*.5; gl_FragColor=vec4(uC,a); }' });
    const m = new THREE.Mesh(g, mat); m.position.copy(origin); m.lookAt(target); m.renderOrder = 5; m.frustumCulled = false; scene.add(m); return m;
  }
  const streetCone = lightCone(V(-2.75, 5.0, 7.5), V(-2.75, 0, 7.7), 30, 0xffe2b0);
  const terasCone = lightCone(V(.3, 1.95, 2.45), V(.3, 0, 3.6), 32, 0xffd9a0);
  const streetGlow = sprite(0xffe2b0, 2.4, V(-2.75, 5.05, 7.5));
  const genGlowS = sprite(0x41ff7a, .35, V(4.6, .72, 2.0));
  function insects(n, c, rad, seed) {
    const R = rng(seed), P = []; for (let i = 0; i < n; i++) P.push({ r: .25 + R() * rad, w: (1.5 + R() * 3.5) * (R() < .5 ? -1 : 1), ph: R() * 6.28, h: R() * 1.1 - .55, wb: .6 + R() * 1.2 });
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const mat = new THREE.PointsMaterial({ color: 0xfff0c8, size: .055, map: gt, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; scene.add(pts);
    return { mat, upd(t) { const a = geo.attributes.position; P.forEach((p, i) => { const ang = p.w * t + p.ph, rr = p.r * (.65 + .35 * Math.sin(p.wb * t + p.ph)); a.setXYZ(i, c.x + Math.cos(ang) * rr, c.y + p.h + Math.sin(t * 2.3 * p.wb + p.ph) * .25, c.z + Math.sin(ang) * rr); }); a.needsUpdate = true; } };
  }
  const insA = insects(70, V(-2.75, 4.9, 7.5), .9, 4);

  // ================= apply: state + waktu =================
  function apply(st, t, B) {
    const { dark, kiosk, neigh, gen, candle, blender } = st;
    const nite = ss(.45, .8, dark);
    sky.material.opacity = nite; moonGlow.material.opacity = nite * .8; moon.material.opacity = nite;
    hwin.emissiveIntensity = neigh * 1.4; roomBulb.emissiveIntensity = neigh * 3; roomLight.intensity = neigh * 5;
    const fl = .78 + .14 * Math.sin(t * 21.3) + .08 * Math.sin(t * 37.7 + 1.3) + .06 * Math.sin(t * 61 + .4);
    candleLight.intensity = candle * 3.4 * fl; flameMat.emissiveIntensity = candle * 3.2; flame.scale.set(.011 * (.9 + .2 * fl), .0001 + .03 * candle * (.8 + .4 * fl), .011); candleGlow.material.opacity = candle * .85 * fl;
    const w0 = 16, tau = 1.15, ang = t < B ? w0 * t : w0 * B + w0 * tau * (1 - Math.exp(-(t - B) / tau)), om = t < B ? 1 : Math.exp(-(t - B) / tau);
    blades.rotation.z = -ang; blur.material.opacity = .32 * Math.min(1, om * 1.05); head.rotation.y = Math.sin(t * .8) * .4 * om;
    const nf = kiosk < .99 ? (.55 + .45 * Math.sin(t * 90)) : 1;
    neonMat.emissiveIntensity = kiosk * 1.4 * nf; neonGlow.material.opacity = kiosk * .4 * nf;
    terasMat.emissiveIntensity = kiosk * 3; terasLight.intensity = kiosk * dark * 3.2; terasGlow.material.opacity = kiosk * dark * .9; terasCone.material.uniforms.uI.value = kiosk * dark * .8;
    streetGlow.material.opacity = neigh * .95; streetCone.material.uniforms.uI.value = neigh * .75;
    poolMat.opacity = kiosk * dark * .5; panelLedMat.emissiveIntensity = gen * 2.2; genGlowS.material.opacity = gen * dark * .9;
    insA.mat.opacity = neigh * .7; insA.upd(t);
  }
  return { apply, scooters };
}
