// mat.js — material PBR prosedural: color + normal + roughness map (marmer, keramik, kayu, baja, rotan, cat, kain, lantai).
import * as THREE from 'three';
export function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
export function tex(c, srgb = true, rep = [1, 1]) { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); t.anisotropy = 8; return t; }
let ENV = null; export const ENV_K = .38; export const setEnv = e => { ENV = e; };

// peta tinggi (grayscale) -> normal map (Sobel)
export function normalFrom(hc, strength = 2) {
  const w = hc.width, h = hc.height, src = hc.getContext('2d').getImageData(0, 0, w, h).data;
  const [out, o] = cv(w, h), id = o.createImageData(w, h);
  const L = (x, y) => { x = (x + w) % w; y = (y + h) % h; const i = (y * w + x) * 4; return (src[i] + src[i + 1] + src[i + 2]) / 765; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (L(x + 1, y - 1) + 2 * L(x + 1, y) + L(x + 1, y + 1)) - (L(x - 1, y - 1) + 2 * L(x - 1, y) + L(x - 1, y + 1));
    const dy = (L(x - 1, y + 1) + 2 * L(x, y + 1) + L(x + 1, y + 1)) - (L(x - 1, y - 1) + 2 * L(x, y - 1) + L(x + 1, y - 1));
    let nx = -dx * strength, ny = dy * strength, nz = 1; const l = Math.hypot(nx, ny, nz), i = (y * w + x) * 4;
    id.data[i] = (nx / l * .5 + .5) * 255; id.data[i + 1] = (ny / l * .5 + .5) * 255; id.data[i + 2] = (nz / l * .5 + .5) * 255; id.data[i + 3] = 255;
  }
  o.putImageData(id, 0, 0); return tex(out, false);
}

// pabrik material: draw(ctx,w,h,R) warna; height(ctx,w,h,R) opsional; rough(ctx,w,h,R) opsional
export function pbr({ size = 512, draw, height, rough, nStrength = 2, roughness = .6, metalness = 0, seed = 1, env = 1, ...o }) {
  const R = rng(seed), [c, x] = cv(size, size); draw(x, size, size, R);
  const m = new THREE.MeshStandardMaterial({ map: tex(c), roughness, metalness, ...o });
  if (height) { const [hc, hx] = cv(size, size); height(hx, size, size, rng(seed + 7)); m.normalMap = normalFrom(hc, nStrength); }
  if (rough) { const [rc, rx] = cv(size, size); rough(rx, size, size, rng(seed + 13)); m.roughnessMap = tex(rc, false); m.roughness = 1; }
  if (ENV) { m.envMap = ENV; m.envMapIntensity = env * ENV_K; }
  return m;
}
// salinan material dengan pengulangan tekstur berbeda (agar skala nyata per permukaan)
export function rep(mat, rx, ry) { const m = mat.clone(); for (const k of ['map', 'normalMap', 'roughnessMap']) if (mat[k]) { m[k] = mat[k].clone(); m[k].repeat.set(rx, ry); m[k].needsUpdate = true; } if (ENV && !m.envMap) m.envMap = ENV; return m; }
export const plain = (color, o = {}) => { const { envI, env, ...rest } = o; const m = new THREE.MeshStandardMaterial({ color, roughness: .6, metalness: 0, ...rest }); if (ENV && env !== 0) { m.envMap = ENV; m.envMapIntensity = (envI ?? .5) * ENV_K; } return m; };

// ---------- marmer putih bergaris abu (seperti di kios) — ukuran 1,2 m ----------
export function marble() {
  return pbr({ size: 1024, seed: 11, roughness: .18, env: .9, nStrength: 0.6,
    draw(x, w, h, R) {
      x.fillStyle = '#f3f1ee'; x.fillRect(0, 0, w, h);
      for (let i = 0; i < 40; i++) { const g = x.createRadialGradient(R() * w, R() * h, 10, R() * w, R() * h, 160 + R() * 240); g.addColorStop(0, `rgba(190,192,196,${.05 + R() * .08})`); g.addColorStop(1, 'rgba(190,192,196,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); }
      const layer = (blur, fn) => { const [lc, lx] = cv(w, h); lx.lineCap = 'round'; lx.lineJoin = 'round'; fn(lx); x.filter = `blur(${blur}px)`; x.drawImage(lc, 0, 0); x.filter = 'none'; };
      const vein = (c, px, py, ang, len, wd, a, depth) => {
        c.strokeStyle = `rgba(${95 + R() * 25 | 0},${100 + R() * 25 | 0},${108 + R() * 25 | 0},${a})`; c.lineWidth = wd; c.beginPath(); c.moveTo(px, py);
        let cx = px, cy2 = py; const steps = len / 22 | 0;
        for (let s2 = 0; s2 < steps; s2++) { ang += (R() - .5) * .55; cx += Math.cos(ang) * 22; cy2 += Math.sin(ang) * 22; c.lineTo(cx, cy2); if (depth < 2 && R() < .12) { vein(c, cx, cy2, ang + (R() < .5 ? -1 : 1) * (.4 + R() * .6), len * .4, wd * .55, a * .8, depth + 1); c.beginPath(); c.moveTo(cx, cy2); } }
        c.stroke();
      };
      layer(1.5, c => { for (let i = 0; i < 16; i++) vein(c, R() * w, -20, Math.PI * .38 + (R() - .5) * .5, 900, 1.5 + R() * 3.6, .35 + R() * .3, 0); });
      layer(.7, c => { for (let i = 0; i < 26; i++) vein(c, R() * w, R() * h, Math.PI * .38 + (R() - .5) * 1.0, 260, .7 + R() * 1.3, .2 + R() * .2, 1); });
    },
    rough(x, w, h, R) { x.fillStyle = '#2e2e2e'; x.fillRect(0, 0, w, h); for (let i = 0; i < 1500; i++) { const v = 30 + R() * 50 | 0; x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(R() * w, R() * h, 3 + R() * 20, 3 + R() * 20); } },
    height(x, w, h, R) { x.fillStyle = '#808080'; x.fillRect(0, 0, w, h); for (let i = 0; i < 700; i++) { x.fillStyle = `rgba(${R() < .5 ? 255 : 0},${R() < .5 ? 255 : 0},128,.03)`; x.fillRect(R() * w, R() * h, 2 + R() * 14, 2 + R() * 14); } } });
}
// ---------- keramik dinding abu-putih persegi (ubin 10 cm; kanvas = 8x8 ubin = 0,8 m) ----------
export function tiles({ base = '#e8e9e9', grout = '#a3a5a7', n = 8, seed = 23, gloss = .22 } = {}) {
  return pbr({ size: 512, seed, roughness: gloss, env: .8, nStrength: 3,
    draw(x, w, h, R) { x.fillStyle = grout; x.fillRect(0, 0, w, h); const s = w / n; for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const v = 228 + R() * 14 | 0; x.fillStyle = `rgb(${v},${v + 1},${v + 1})`; x.fillRect(i * s + 2, j * s + 2, s - 4, s - 4); const g = x.createLinearGradient(i * s, j * s, i * s + s, j * s + s); g.addColorStop(0, 'rgba(255,255,255,.18)'); g.addColorStop(1, 'rgba(0,0,0,.05)'); x.fillStyle = g; x.fillRect(i * s + 2, j * s + 2, s - 4, s - 4); } },
    height(x, w, h) { x.fillStyle = '#000'; x.fillRect(0, 0, w, h); const s = w / n; x.fillStyle = '#fff'; for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) x.fillRect(i * s + 3, j * s + 3, s - 6, s - 6); },
    rough(x, w, h) { x.fillStyle = '#d0d0d0'; x.fillRect(0, 0, w, h); const s = w / n; x.fillStyle = '#383838'; for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) x.fillRect(i * s + 3, j * s + 3, s - 6, s - 6); } });
}
// ---------- kayu pernis oranye-cokelat ----------
export function wood({ base = [196, 120, 52], seed = 5 } = {}) {
  return pbr({ size: 512, seed, roughness: .5, env: .5, nStrength: 1.4,
    draw(x, w, h, R) { x.fillStyle = `rgb(${base})`; x.fillRect(0, 0, w, h); for (let i = 0; i < 380; i++) { const y = R() * h, a = .05 + R() * .16; x.strokeStyle = R() < .6 ? `rgba(80,40,15,${a})` : `rgba(255,200,130,${a * .8})`; x.lineWidth = .6 + R() * 2.4; x.beginPath(); x.moveTo(0, y); for (let px = 0; px <= w; px += 32) x.lineTo(px, y + Math.sin(px * .02 + i) * (2 + R() * 3)); x.stroke(); } const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,255,255,.06)'); g.addColorStop(1, 'rgba(0,0,0,.08)'); x.fillStyle = g; x.fillRect(0, 0, w, h); },
    height(x, w, h, R) { x.fillStyle = '#808080'; x.fillRect(0, 0, w, h); for (let i = 0; i < 300; i++) { x.strokeStyle = `rgba(${R() < .5 ? 0 : 255},${R() < .5 ? 0 : 255},128,.12)`; x.lineWidth = 1 + R() * 2; const y = R() * h; x.beginPath(); x.moveTo(0, y); x.lineTo(w, y + (R() - .5) * 8); x.stroke(); } } });
}
// ---------- baja sikat (stainless) ----------
export function steel({ tone = 190 } = {}) {
  return pbr({ size: 256, seed: 9, roughness: .38, metalness: 1, env: 1.1, nStrength: .5,
    draw(x, w, h, R) { x.fillStyle = `rgb(${tone},${tone + 3},${tone + 8})`; x.fillRect(0, 0, w, h); for (let i = 0; i < 700; i++) { const v = tone - 40 + R() * 80 | 0; x.fillStyle = `rgba(${v},${v},${v + 4},${.1 + R() * .25})`; x.fillRect(0, R() * h, w, .5 + R() * 1.6); } },
    rough(x, w, h, R) { x.fillStyle = '#5a5a5a'; x.fillRect(0, 0, w, h); for (let i = 0; i < 500; i++) { const v = 70 + R() * 70 | 0; x.fillStyle = `rgba(${v},${v},${v},.5)`; x.fillRect(0, R() * h, w, 1); } } });
}
// ---------- lantai keramik cokelat keemasan 60x60 (kanvas = 2x2 ubin) ----------
export function floorTile() {
  return pbr({ size: 512, seed: 31, roughness: .32, env: .7, nStrength: 2,
    draw(x, w, h, R) { x.fillStyle = '#8a6a3a'; x.fillRect(0, 0, w, h); const s = w / 2; for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) { const b = 178 + R() * 14 | 0; x.fillStyle = `rgb(${b},${b * .8 | 0},${b * .5 | 0})`; x.fillRect(i * s + 3, j * s + 3, s - 6, s - 6); for (let k = 0; k < 1500; k++) { x.fillStyle = `rgba(${R() < .5 ? '255,235,190' : '90,60,25'},${.05 + R() * .12})`; x.fillRect(i * s + R() * s, j * s + R() * s, 1 + R() * 3, 1 + R() * 3); } } },
    height(x, w, h) { x.fillStyle = '#000'; x.fillRect(0, 0, w, h); x.fillStyle = '#fff'; const s = w / 2; for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) x.fillRect(i * s + 4, j * s + 4, s - 8, s - 8); },
    rough(x, w, h) { x.fillStyle = '#c0c0c0'; x.fillRect(0, 0, w, h); x.fillStyle = '#505050'; const s = w / 2; for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) x.fillRect(i * s + 4, j * s + 4, s - 8, s - 8); } });
}
// ---------- cat dinding halus (orange-peel) ----------
export function paint(color = '#e9701a', seed = 2, rough = .75) {
  return pbr({ size: 256, seed, roughness: rough, env: .25, nStrength: 1.1,
    draw(x, w, h, R) { x.fillStyle = color; x.fillRect(0, 0, w, h); for (let i = 0; i < 2500; i++) { x.fillStyle = `rgba(${R() < .5 ? '255,255,255' : '0,0,0'},${.012 + R() * .03})`; x.fillRect(R() * w, R() * h, 2 + R() * 4, 2 + R() * 4); } },
    height(x, w, h, R) { x.fillStyle = '#808080'; x.fillRect(0, 0, w, h); for (let i = 0; i < 3500; i++) { x.fillStyle = `rgba(${R() < .5 ? 255 : 0},${R() < .5 ? 255 : 0},128,.1)`; x.beginPath(); x.arc(R() * w, R() * h, 1 + R() * 2.5, 0, 7); x.fill(); } } });
}
// ---------- rotan anyam ----------
export function rattan({ base = '#c99a5c', dark = '#9d6f38' } = {}) {
  return pbr({ size: 256, seed: 17, roughness: .85, env: .2, nStrength: 3.2,
    draw(x, w, h) { x.fillStyle = dark; x.fillRect(0, 0, w, h); const n = 12, s = w / n; for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const over = (i + j) % 2 === 0; const g = x.createLinearGradient(0, j * s, 0, j * s + s); g.addColorStop(0, base); g.addColorStop(.5, '#e0b878'); g.addColorStop(1, base); x.fillStyle = over ? g : dark; if (over) x.fillRect(i * s + 1, j * s + 3, s - 2, s - 6); else { const g2 = x.createLinearGradient(i * s, 0, i * s + s, 0); g2.addColorStop(0, dark); g2.addColorStop(.5, '#b88a50'); g2.addColorStop(1, dark); x.fillStyle = g2; x.fillRect(i * s + 3, j * s + 1, s - 6, s - 2); } } },
    height(x, w, h) { x.fillStyle = '#000'; x.fillRect(0, 0, w, h); const n = 12, s = w / n; for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const over = (i + j) % 2 === 0; x.fillStyle = over ? '#fff' : '#777'; if (over) x.fillRect(i * s + 1, j * s + 3, s - 2, s - 6); else x.fillRect(i * s + 3, j * s + 1, s - 6, s - 2); } } });
}
// ---------- kain tirai berlipit ----------
export function fabric(color = '#b3122e', seed = 3) {
  const col = new THREE.Color(color);
  return pbr({ size: 256, seed, roughness: .92, env: .15, nStrength: 1.2, side: THREE.DoubleSide,
    draw(x, w, h, R) { x.fillStyle = color; x.fillRect(0, 0, w, h); for (let i = 0; i < 16; i++) { const g = x.createLinearGradient(i * w / 16, 0, (i + 1) * w / 16, 0); g.addColorStop(0, 'rgba(0,0,0,.28)'); g.addColorStop(.5, 'rgba(255,255,255,.1)'); g.addColorStop(1, 'rgba(0,0,0,.28)'); x.fillStyle = g; x.fillRect(i * w / 16, 0, w / 16, h); } for (let i = 0; i < 2500; i++) { x.fillStyle = `rgba(${R() < .5 ? '255,255,255' : '0,0,0'},.04)`; x.fillRect(R() * w, R() * h, 1, 3); } },
    height(x, w, h) { x.fillStyle = '#000'; x.fillRect(0, 0, w, h); for (let i = 0; i < 64; i++) { x.fillStyle = i % 2 ? '#ccc' : '#444'; x.fillRect(i * w / 64, 0, w / 64, h); } } });
}
// ---------- beton halus ----------
export function concrete(color = '#bdbab2', rep = 1) {
  return pbr({ size: 512, seed: 41, roughness: .9, env: .15, nStrength: 1.6,
    draw(x, w, h, R) { x.fillStyle = color; x.fillRect(0, 0, w, h); for (let i = 0; i < 9000; i++) { const v = 150 + R() * 70 | 0; x.fillStyle = `rgba(${v},${v - 2},${v - 6},${.12 + R() * .3})`; x.fillRect(R() * w, R() * h, 1 + R() * 2.5, 1 + R() * 2.5); } },
    height(x, w, h, R) { x.fillStyle = '#808080'; x.fillRect(0, 0, w, h); for (let i = 0; i < 6000; i++) { x.fillStyle = `rgba(${R() < .5 ? 255 : 0},${R() < .5 ? 255 : 0},128,.12)`; x.fillRect(R() * w, R() * h, 1 + R() * 3, 1 + R() * 3); } } });
}
// ---------- gulungan pintu rolling door (seng bergelombang horizontal) ----------
export function shutter(color = '#8b929a') {
  return pbr({ size: 256, seed: 51, roughness: .45, metalness: .6, env: .8, nStrength: 3,
    draw(x, w, h, R) { for (let j = 0; j < 16; j++) { const g = x.createLinearGradient(0, j * h / 16, 0, (j + 1) * h / 16); g.addColorStop(0, color); g.addColorStop(.5, '#b4bbc2'); g.addColorStop(1, '#6d747b'); x.fillStyle = g; x.fillRect(0, j * h / 16, w, h / 16); } for (let i = 0; i < 400; i++) { x.fillStyle = `rgba(0,0,0,${.03 + R() * .05})`; x.fillRect(R() * w, R() * h, 1 + R() * 3, 1); } },
    height(x, w, h) { for (let j = 0; j < 16; j++) { const g = x.createLinearGradient(0, j * h / 16, 0, (j + 1) * h / 16); g.addColorStop(0, '#000'); g.addColorStop(.5, '#fff'); g.addColorStop(1, '#000'); x.fillStyle = g; x.fillRect(0, j * h / 16, w, h / 16); } } });
}
