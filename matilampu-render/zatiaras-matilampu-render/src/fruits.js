// fruits.js — buah prosedural yang lebih nyata: bentuk dari profil (lathe), tekstur kulit, bump, kilau.
// Satuan meter, ukuran nyata. Asal (origin) ada di dasar buah (y=0) kecuali dikatakan lain.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
const CT = (c, srgb = true) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
const spline = (ctrl, n) => new THREE.SplineCurve(ctrl.map(p => new THREE.Vector2(p[0], p[1]))).getPoints(n).map(p => new THREE.Vector2(Math.max(0, p.x), p.y));
const lathe = (pts, seg = 48, p0 = 0, pl = Math.PI * 2) => new THREE.LatheGeometry(pts, seg, p0, pl);
const mesh = (g, m) => { const o = new THREE.Mesh(g, m); o.castShadow = true; o.receiveShadow = true; return o; };

// ---------------- stroberi ----------------
export function strawberry(seed = 1) {
  const R = rng(seed), g = new THREE.Group(), h = .046, Rr = .018;
  const pts = spline([[0, 0], [.3 * Rr, .05 * h], [.72 * Rr, .3 * h], [.97 * Rr, .62 * h], [Rr, .82 * h], [.86 * Rr, .95 * h], [.45 * Rr, h], [0, h * .995]], 30);
  const [c1, x1] = cv(256, 256), [c2, x2] = cv(256, 256);
  const gr = x1.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#ae0f1f'); gr.addColorStop(.55, '#d71f2b'); gr.addColorStop(1, '#ee4d3b'); x1.fillStyle = gr; x1.fillRect(0, 0, 256, 256);
  x2.fillStyle = '#bbb'; x2.fillRect(0, 0, 256, 256);
  for (let j = 0; j < 22; j++) for (let i = 0; i < 15; i++) {
    const px = (i + (j % 2) * .5) * 256 / 15 + (R() - .5) * 2, py = 8 + j * 11 + (R() - .5) * 2;
    x1.fillStyle = 'rgba(105,10,20,.6)'; x1.beginPath(); x1.ellipse(px, py + 1.5, 3.4, 4.6, 0, 0, 7); x1.fill();
    x1.fillStyle = '#efcf74'; x1.beginPath(); x1.ellipse(px, py, 2, 3.2, 0, 0, 7); x1.fill();
    x2.fillStyle = '#333'; x2.beginPath(); x2.ellipse(px, py, 3.6, 5, 0, 0, 7); x2.fill();
  }
  g.add(mesh(lathe(pts, 40), new THREE.MeshPhysicalMaterial({ map: CT(c1), bumpMap: CT(c2, false), bumpScale: 1.4, roughness: .34, clearcoat: .45, clearcoatRoughness: .3 })));
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x3f8f2f, roughness: .6, side: THREE.DoubleSide });
  for (let i = 0; i < 7; i++) { const pv = new THREE.Group(); pv.position.y = h * .99; pv.rotation.y = i / 7 * Math.PI * 2 + R() * .3; const lf = mesh(new THREE.SphereGeometry(1, 10, 8), leafMat); lf.scale.set(.0105, .0009, .0042); lf.position.set(.0085, 0, 0); lf.rotation.z = -.32; pv.add(lf); g.add(pv); }
  const st = mesh(new THREE.CylinderGeometry(.0014, .0017, .012, 6), new THREE.MeshStandardMaterial({ color: 0x4a7a2a, roughness: .7 })); st.position.y = h + .005; g.add(st);
  g.userData.len = h; return g;
}

// ---------------- mangga ----------------
export function mango(seed = 2) {
  const R = rng(seed), g = new THREE.Group(), H = .14, ctrl = [];
  for (let i = 0; i <= 16; i++) { const t = i / 16; ctrl.push(new THREE.Vector2(.057 * Math.pow(Math.sin(Math.PI * t), .62) * (1 + .14 * (t - .5)), t * H)); }
  const [c, x] = cv(256, 512);
  const gr = x.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, '#8fae3a'); gr.addColorStop(.3, '#d3c23c'); gr.addColorStop(.7, '#f0a22d'); gr.addColorStop(1, '#e5802a'); x.fillStyle = gr; x.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 70; i++) { x.fillStyle = `rgba(${R() < .5 ? '90,120,30' : '255,200,80'},${.05 + R() * .08})`; x.fillRect(R() * 256, 0, 1 + R() * 4, 512); }
  const bl = x.createRadialGradient(80, 300, 8, 80, 300, 170); bl.addColorStop(0, 'rgba(205,60,40,.7)'); bl.addColorStop(1, 'rgba(205,60,40,0)'); x.fillStyle = bl; x.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(255,240,170,${.25 + R() * .35})`; x.beginPath(); x.arc(R() * 256, R() * 512, .8 + R() * 1.4, 0, 7); x.fill(); }
  const m = mesh(lathe(ctrl, 40), new THREE.MeshPhysicalMaterial({ map: CT(c), roughness: .42, clearcoat: .14, clearcoatRoughness: .4 })); m.scale.z = .88; g.add(m);
  const stem = mesh(new THREE.CylinderGeometry(.0035, .0048, .014, 8), new THREE.MeshStandardMaterial({ color: 0x5b3b1a, roughness: .8 })); stem.position.set(.002, H + .004, 0); stem.rotation.z = -.2; g.add(stem);
  const cap = mesh(new THREE.SphereGeometry(.015, 12, 8), new THREE.MeshStandardMaterial({ color: 0x7a8f2e, roughness: .7 })); cap.scale.set(1, .4, .9); cap.position.y = H - .002; g.add(cap);
  g.userData.len = H; return g;
}

// ---------------- alpukat (mentega, hijau) ----------------
const AVO = [[0, 0], [.03, .004], [.05, .03], [.055, .06], [.046, .093], [.032, .118], [.022, .138], [.017, .148], [0, .152]], AVO_H = .152;
function avoSkin(seed) {
  const R = rng(seed), [c, x] = cv(256, 256), [b, y] = cv(256, 256);
  const gr = x.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#5f8a2c'); gr.addColorStop(.5, '#3f6b22'); gr.addColorStop(1, '#2b5019'); x.fillStyle = gr; x.fillRect(0, 0, 256, 256);
  y.fillStyle = '#999'; y.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) { const px = R() * 256, py = R() * 256, r = .8 + R() * 2.2; x.fillStyle = `rgba(${R() < .5 ? '170,200,90' : '20,40,12'},${.12 + R() * .2})`; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill(); y.fillStyle = R() < .5 ? '#bbb' : '#6a6a6a'; y.beginPath(); y.arc(px, py, r, 0, 7); y.fill(); }
  return new THREE.MeshPhysicalMaterial({ map: CT(c), bumpMap: CT(b, false), bumpScale: 1.1, roughness: .52, clearcoat: .1 });
}
export function avocado(seed = 3) {
  const g = new THREE.Group(); g.add(mesh(lathe(spline(AVO, 36), 40), avoSkin(seed)));
  const nub = mesh(new THREE.CylinderGeometry(.003, .004, .01, 6), new THREE.MeshStandardMaterial({ color: 0x5b4a22, roughness: .8 })); nub.position.y = AVO_H + .002; g.add(nub);
  g.userData.len = AVO_H; return g;
}
export function avocadoHalf(seed = 5) {
  const g = new THREE.Group(), samp = spline(AVO, 40);
  g.add(mesh(lathe(samp, 40, Math.PI / 2, Math.PI), avoSkin(seed)));      // setengah kulit, z <= 0
  // bidang potong (z = 0): daging hijau-kuning + pinggiran kulit
  const W = 256, Hc = 512, sx = 128 / .058, sy = Hc / AVO_H, [c, x] = cv(W, Hc);
  const path = () => { x.beginPath(); samp.forEach((p, i) => i ? x.lineTo(128 + p.x * sx, Hc - p.y * sy) : x.moveTo(128 + p.x * sx, Hc - p.y * sy)); for (let i = samp.length - 1; i >= 0; i--) x.lineTo(128 - samp[i].x * sx, Hc - samp[i].y * sy); x.closePath(); };
  const rg = x.createRadialGradient(128, Hc - .052 * sy, 8, 128, Hc - .06 * sy, 150); rg.addColorStop(0, '#f3f0a4'); rg.addColorStop(.45, '#dfe78f'); rg.addColorStop(.8, '#b4d25f'); rg.addColorStop(1, '#8fbb3f');
  path(); x.fillStyle = rg; x.fill(); x.lineJoin = 'round'; x.lineWidth = 9; x.strokeStyle = '#2f5a1f'; x.stroke();
  const shp = new THREE.Shape(); samp.forEach((p, i) => i ? shp.lineTo(p.x, p.y) : shp.moveTo(p.x, p.y)); for (let i = samp.length - 1; i >= 0; i--) shp.lineTo(-samp[i].x, samp[i].y);
  const fg = new THREE.ShapeGeometry(shp, 8), uv = fg.attributes.uv, ps = fg.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, .5 + ps.getX(i) / .116, ps.getY(i) / AVO_H);
  g.add(mesh(fg, new THREE.MeshPhysicalMaterial({ map: CT(c), roughness: .4, clearcoat: .2, clearcoatRoughness: .5 })));
  const pit = mesh(new THREE.SphereGeometry(.023, 24, 18), new THREE.MeshPhysicalMaterial({ color: 0x6b3a1c, roughness: .3, clearcoat: .6 })); pit.position.set(0, .052, -.002); g.add(pit);
  g.userData.len = AVO_H; return g;
}

// ---------------- buah naga ----------------
export function dragonFruit(seed = 4) {
  const R = rng(seed), g = new THREE.Group(), rx = .052, ry = .072;
  const [c, x] = cv(128, 256); const gr = x.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#e23b82'); gr.addColorStop(.6, '#d4286f'); gr.addColorStop(1, '#bb1a5c'); x.fillStyle = gr; x.fillRect(0, 0, 128, 256);
  for (let i = 0; i < 600; i++) { x.fillStyle = `rgba(${R() < .5 ? '255,160,200' : '110,10,60'},.08)`; x.fillRect(R() * 128, R() * 256, 2 + R() * 4, 2 + R() * 4); }
  const body = mesh(new THREE.SphereGeometry(1, 36, 24), new THREE.MeshStandardMaterial({ map: CT(c), roughness: .5 })); body.scale.set(rx, ry, rx); g.add(body);
  const up = new THREE.Vector3(0, 1, 0), Y = new THREE.Vector3(0, 1, 0);
  const mk = (n, len) => { const geo = new THREE.ConeGeometry(.0105, len, 4); geo.translate(0, len / 2, 0); const col = []; const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const t = Math.min(1, Math.max(0, p.getY(i) / len)), a = new THREE.Color(0xd6296f), b = new THREE.Color(0x7cc65a), k = new THREE.Color().lerpColors(a, b, Math.pow(Math.max(0, (t - .35) / .65), 1.3)); col.push(k.r, k.g, k.b); } geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.scale(1, 1, .22); return geo; };
  const sg = mk(0, .022), tg = mk(0, .03), mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .6 });
  const placeScale = (lat, lon, geo) => { const nx = Math.cos(lat) * Math.cos(lon), ny = Math.sin(lat), nz = Math.cos(lat) * Math.sin(lon); const n = new THREE.Vector3(nx, ny, nz).normalize(); const dir = n.clone().multiplyScalar(.95).add(up.clone().multiplyScalar(.28 + .22 * Math.max(0, ny))).normalize(); const m = mesh(geo, mat); m.position.set(nx * rx, ny * ry, nz * rx); m.quaternion.setFromUnitVectors(Y, dir); g.add(m); };
  for (let k = 0; k < 11; k++) { const lat = (-62 + k * 12.4) * Math.PI / 180, cnt = Math.max(6, Math.round(15 * Math.cos(lat))); for (let i = 0; i < cnt; i++) placeScale(lat, i / cnt * Math.PI * 2 + (k % 2) * .3 + (R() - .5) * .15, sg); }
  for (let i = 0; i < 7; i++) placeScale(Math.PI * .46, i / 7 * Math.PI * 2, tg);
  g.userData.len = ry * 2; return g;
}
export function dragonHalf(seed = 6) {
  const R = rng(seed), g = new THREE.Group(), rx = .052, ry = .072;
  const [c, x] = cv(256, 256); x.fillStyle = '#c9206a'; x.fillRect(0, 0, 256, 256);
  x.fillStyle = '#f7f1f5'; x.beginPath(); x.ellipse(128, 128, 112, 112, 0, 0, 7); x.fill();
  const rg = x.createRadialGradient(128, 128, 6, 128, 128, 112); rg.addColorStop(0, 'rgba(255,255,255,.9)'); rg.addColorStop(1, 'rgba(235,205,222,.6)'); x.fillStyle = rg; x.beginPath(); x.ellipse(128, 128, 110, 110, 0, 0, 7); x.fill();
  for (let i = 0; i < 520; i++) { const a = R() * 6.28, r = Math.sqrt(R()) * 100; x.fillStyle = R() < .85 ? '#1b1412' : '#3a2a28'; x.beginPath(); x.ellipse(128 + Math.cos(a) * r, 128 + Math.sin(a) * r, .9 + R() * .8, 1.3 + R() * .9, R() * 3, 0, 7); x.fill(); }
  const face = mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshPhysicalMaterial({ map: CT(c), roughness: .3, clearcoat: .35 })); face.scale.set(rx, ry, 1); g.add(face);
  const [c2, x2] = cv(64, 128); const gg = x2.createLinearGradient(0, 0, 0, 128); gg.addColorStop(0, '#e23b82'); gg.addColorStop(1, '#bb1a5c'); x2.fillStyle = gg; x2.fillRect(0, 0, 64, 128);
  const skin = mesh(new THREE.SphereGeometry(1, 32, 20, Math.PI, Math.PI), new THREE.MeshStandardMaterial({ map: CT(c2), roughness: .5, side: THREE.DoubleSide })); skin.scale.set(rx, ry, rx); g.add(skin);
  g.userData.len = ry * 2; return g;
}

// ---------------- pepaya ----------------
export function papaya(seed = 7) {
  const R = rng(seed), g = new THREE.Group(), H = .26, ctrl = [[0, 0], [.028, .012], [.052, .05], [.062, .11], [.054, .17], [.038, .22], [.03, .248], [0, .258]];
  const [c, x] = cv(256, 512); const gr = x.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, '#9bb23a'); gr.addColorStop(.28, '#e2b13a'); gr.addColorStop(.7, '#f08a24'); gr.addColorStop(1, '#e8741f'); x.fillStyle = gr; x.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 90; i++) { x.fillStyle = `rgba(${R() < .5 ? '110,140,40' : '255,170,60'},${.05 + R() * .1})`; x.fillRect(R() * 256, 0, 1 + R() * 5, 512); }
  for (let i = 0; i < 500; i++) { x.fillStyle = `rgba(120,70,20,${.04 + R() * .08})`; x.beginPath(); x.arc(R() * 256, R() * 512, 1 + R() * 2.4, 0, 7); x.fill(); }
  g.add(mesh(lathe(spline(ctrl, 40), 40), new THREE.MeshPhysicalMaterial({ map: CT(c), roughness: .46, clearcoat: .12 })));
  const st = mesh(new THREE.CylinderGeometry(.006, .009, .02, 8), new THREE.MeshStandardMaterial({ color: 0x5f6b2a, roughness: .8 })); st.position.y = H + .008; g.add(st);
  g.userData.len = H; return g;
}

// ---------------- potongan (untuk blender rumah) ----------------
export function mangoCube(seed = 8) { const R = rng(seed); const m = mesh(new RoundedBoxGeometry(.028, .026, .03, 2, .004), new THREE.MeshPhysicalMaterial({ color: new THREE.Color().setHSL(.11 + R() * .02, .9, .56), roughness: .35, clearcoat: .3 })); return m; }
export function bananaSlice(seed = 9) { const g = new THREE.Group(); g.add(mesh(new THREE.CylinderGeometry(.018, .018, .008, 20), new THREE.MeshStandardMaterial({ color: 0xf2e3a4, roughness: .55 }))); const d = mesh(new THREE.CylinderGeometry(.004, .004, .0085, 8), new THREE.MeshStandardMaterial({ color: 0x6b4a22 })); g.add(d); return g; }

// letakkan buah berbaring: pusatkan lalu putar
export function centered(obj, len) { const g = new THREE.Group(); obj.position.y -= len / 2; g.add(obj); return g; }

// ---------------- jeruk & apel (untuk rak buah) ----------------
export function orange(seed = 60) {
  const R = rng(seed), g = new THREE.Group(), r = .037;
  const [c, x] = cv(256, 256), [b, y] = cv(256, 256);
  const gr = x.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#f2951f'); gr.addColorStop(.5, '#ec7f12'); gr.addColorStop(1, '#df6a0c'); x.fillStyle = gr; x.fillRect(0, 0, 256, 256);
  y.fillStyle = '#aaa'; y.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) { const px = R() * 256, py = R() * 256, rr = .6 + R() * 1.1; x.fillStyle = `rgba(${R() < .5 ? '255,200,100' : '150,60,0'},${.1 + R() * .18})`; x.beginPath(); x.arc(px, py, rr, 0, 7); x.fill(); y.fillStyle = '#555'; y.beginPath(); y.arc(px, py, rr, 0, 7); y.fill(); }
  const m = mesh(new THREE.SphereGeometry(r, 28, 20), new THREE.MeshPhysicalMaterial({ map: CT(c), bumpMap: CT(b, false), bumpScale: 1.2, roughness: .55, clearcoat: .08 })); m.scale.y = .94; m.position.y = r * .94; g.add(m);
  const st = mesh(new THREE.CylinderGeometry(.0025, .003, .005, 6), new THREE.MeshStandardMaterial({ color: 0x5a6a2a, roughness: .8 })); st.position.y = r * 1.88; g.add(st);
  g.userData.len = r * 1.9; return g;
}
export function apple(seed = 61) {
  const R = rng(seed), g = new THREE.Group();
  const pts = spline([[0, .002], [.02, 0], [.04, .012], [.047, .034], [.044, .057], [.031, .07], [.014, .068], [.005, .058]], 26);
  const [c, x] = cv(256, 256); const gr = x.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#b0141f'); gr.addColorStop(.5, '#cf2a2a'); gr.addColorStop(1, '#d9b23a'); x.fillStyle = gr; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 70; i++) { x.fillStyle = `rgba(${R() < .6 ? '120,10,20' : '230,200,70'},${.05 + R() * .12})`; x.fillRect(R() * 256, 0, 1 + R() * 5, 256); }
  for (let i = 0; i < 600; i++) { x.fillStyle = 'rgba(255,230,160,.35)'; x.beginPath(); x.arc(R() * 256, R() * 256, .6 + R() * .9, 0, 7); x.fill(); }
  g.add(mesh(lathe(pts, 36), new THREE.MeshPhysicalMaterial({ map: CT(c), roughness: .32, clearcoat: .5, clearcoatRoughness: .25 })));
  const st = mesh(new THREE.CylinderGeometry(.0018, .0022, .018, 6), new THREE.MeshStandardMaterial({ color: 0x4a3a1a, roughness: .8 })); st.position.y = .068; st.rotation.z = .15; g.add(st);
  g.userData.len = .072; return g;
}
