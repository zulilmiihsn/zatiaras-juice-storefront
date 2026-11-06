// Zatiaras Edukasi/Konten — "Mati lampu? Ke Zatiaras Juice aja" (kios tetap buka pakai genset)
// Satu timeline GSAP (paused) menggerakkan state S; draw() membaca S + waktu. Siap di-seek untuk render frame demi frame.
import * as THREE from 'three';
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { buildKiosk } from './kiosk.js';
import { makePost } from './post.js';
gsap.registerPlugin(SplitText);

const RENDER = /[?&]render/.test(location.search);

// =====================================================================
// KONFIGURASI — ubah di sini saja saat waktu disesuaikan dengan voice over
// =====================================================================
const CFG = {
  DUR: 37.0,
  blackout: 1.6,          // lampu tetangga + jalan padam, kios ikut padam sebentar
  gensetOn: 2.8,          // genset menyala, kios hidup lagi
  caps: [                 // [mulai, selesai, teks besar, teks kecil, layout]  — satu frasa pendek per caption, tidak ada yang bertumpuk
    [1.8, 4.8, 'Yah, <em>mati lampu.</em>', '', { x: 9, y: 22, w: 82, a: 'center', r: -1.2, s: 10.6 }],
    [5.4, 8.6, 'Kipas berhenti, <em>gerah banget.</em>', '', { x: 9, y: 22, w: 82, a: 'right', r: 1.2, s: 8.8 }],
    [8.9, 12.0, 'Pengennya yang <em>adem,</em> yang seger-seger.', '', { x: 9, y: 22, w: 82, a: 'left', r: -1, s: 8.4 }],
    [12.2, 14.4, 'Bikin <em>jus sendiri?</em>', '', { x: 9, y: 22, w: 82, a: 'center', r: 1, s: 10.2 }],
    [14.6, 17.4, '<em>Blendernya</em> juga butuh listrik, dong.', '', { x: 9, y: 22, w: 82, a: 'right', r: -1, s: 8.6 }],
    [17.6, 20.8, 'Tapi di <em>Zatiaras Juice</em> ada <em>genset.</em>', '', { x: 9, y: 22, w: 82, a: 'left', r: 1.2, s: 8.6 }],
    [21.4, 24.4, 'Tetap buka, blender <em>tetap muter.</em>', '', { x: 9, y: 22, w: 82, a: 'center', r: -1, s: 8.6 }],
    [24.8, 27.4, '<em>ACnya</em> juga tetap nyala.', '', { x: 9, y: 22, w: 82, a: 'right', r: 1, s: 9.4 }],
    [27.8, 30.8, 'Jadi <em>adem,</em> jusnya seger.', '', { x: 9, y: 22, w: 82, a: 'left', r: -1.2, s: 9.4 }],
    [31.4, 36.0, 'Kalau mati lampu, <em>ke Zatiaras Juice aja!</em>', '', { x: 9, y: 112, w: 82, a: 'center', r: -1, s: 8.6 }],
  ],
  endAt: 32.6,            // kartu penutup: logo + tagline
  chips: [                // label: [mulai, selesai, teks, jenis, posisi]
    [19.9, 21.3, 'Genset nyala', 'world', [4.9, 1.55, 1.7]],
    [25.2, 27.0, 'AC tetap nyala', 'world', [-.2, 2.45, -1.7]],
  ],
  cam: [                  // keyframe kamera: [waktu, [pos], [target], fov, ease?]
    [0.0, [0.5, 3.4, 36], [0.8, 2.4, 0], 38],
    [2.6, [-0.5, 3.2, 30], [0.6, 2.35, 0], 36, 'sine.inOut'],
    [5.0, [-3.6, 2.6, 12.5], [-6.6, 2.1, 1.8], 32],       // dorong ke jendela rumah: kipas melambat
    [6.6, [-5.2, 2.15, 6.2], [-6.9, 2.05, 1.2], 30],
    [8.8, [-5.0, 2.1, 5.4], [-6.9, 2.05, 1.2], 30, 'sine.inOut'],
    [10.6, [-5.3, 2.05, 5.0], [-6.9, 2.0, 1.2], 30, 'sine.inOut'],
    [11.8, [-4.9, 1.95, 4.4], [-6.85, 1.7, 1.8], 28],     // rak jendela: lilin + blender rumah yang mati
    [14.0, [-4.8, 1.95, 4.1], [-6.85, 1.7, 1.8], 28, 'sine.inOut'],
    [16.8, [-4.7, 1.95, 3.8], [-6.85, 1.7, 1.8], 27, 'sine.inOut'],
    [18.4, [-1.5, 2.8, 22], [1.2, 2.3, 0], 30],           // mundur: rumah gelap vs Zatiaras Juice menyala
    [19.6, [9.2, 1.5, 8.6], [4.7, 1.0, 1.8], 32],         // genset
    [21.0, [8.0, 1.6, 7.6], [4.3, 1.1, 1.9], 32, 'sine.inOut'],
    [21.7, [1.3, 1.8, 3.7], [0.5, 1.55, 0.2], 32],        // lewat panel kaca kiri yang kosong (tanpa neon)
    [22.4, [1.2, 1.75, 0.9], [-2.9, 1.45, -0.3], 38],     // di dalam: stasiun blender di bar kiri (menghadap kanan)
    [24.4, [-0.6, 1.7, -0.25], [-3.1, 1.45, -0.35], 40, 'sine.inOut'],
    [25.0, [0.6, 1.7, 1.3], [-0.2, 2.45, -1.9], 40],     // AC
    [27.2, [0.4, 1.68, 1.1], [-0.2, 2.5, -1.9], 38, 'sine.inOut'],
    [27.6, [-0.9, 1.7, 0.5], [-2.2, 1.55, -0.8], 36],     // geser halus melewati ruang (tidak lewat tirai)
    [28.0, [-1.5, 1.62, 0.0], [-2.78, 1.3, -0.62], 28],   // cup di bar
    [30.6, [-1.6, 1.62, -0.05], [-2.78, 1.3, -0.62], 28, 'sine.inOut'],
    [30.65, [4.8, 2.2, 10], [2.2, 2.0, 2.0], 30],        // potong (fade singkat) ke tampak kios dari luar
    [33.2, [9.6, 2.7, 18], [2.2, 2.4, 0], 30],
    [37.0, [8.2, 2.7, 19], [2.2, 2.4, 0], 30, 'sine.inOut'],
  ],
};
// ---------- sinkron ke VO (ElevenLabs 1..6.mp3): warp linear-per-bagian dari waktu desain -> waktu nyata ----------
// [waktu desain, waktu nyata]. VO mulai: 1.80 / 4.96 / 12.87 / 17.50 / 23.64 / 29.35 detik; jeda antar frasa diukur dari rekaman.
const ANCH = [[0, 0], [1.8, 1.8], [4.8, 4.5], [5.4, 4.96], [8.6, 8.2], [8.9, 8.58], [12.0, 12.3], [12.2, 12.87], [14.4, 14.3], [14.6, 14.49], [17.4, 16.95], [17.6, 17.5], [20.8, 20.1], [21.4, 20.25], [24.4, 23.1], [24.8, 23.64], [27.4, 25.9], [27.8, 26.08], [30.8, 28.8], [31.4, 29.35], [36.0, 32.9], [37.0, 34.4]];
const W = t => { if (t <= 0) return t; for (let i = 1; i < ANCH.length; i++) if (t <= ANCH[i][0]) { const [a0, b0] = ANCH[i - 1], [a1, b1] = ANCH[i]; return b0 + (t - a0) / (a1 - a0) * (b1 - b0); } const L = ANCH[ANCH.length - 1]; return L[1] + (t - L[0]); };
CFG.caps.forEach(c => { c[0] = W(c[0]); c[1] = W(c[1]); }); CFG.chips.forEach(c => { c[0] = W(c[0]); c[1] = W(c[1]); }); CFG.cam.forEach(k => { k[0] = W(k[0]); });
CFG.blackout = W(CFG.blackout); CFG.gensetOn = W(CFG.gensetOn); CFG.endAt = W(CFG.endAt); CFG.DUR = W(CFG.DUR);
const GL0 = W(21.6), GL1 = W(31.8);
const DUR = CFG.DUR;

// ---------- util ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const nz = (x) => Math.sin(x * 12.9898) * 43758.5453 % 1;

// ---------- renderer & scene ----------
const stage = document.getElementById('stage'), cv = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, preserveDrawingBuffer: RENDER });
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
const camera = new THREE.PerspectiveCamera(30, 9 / 16, .1, 200);
const K = await buildKiosk(renderer);
let post = null;
function fit() { const w = stage.clientWidth, h = stage.clientHeight; renderer.setPixelRatio(RENDER ? 1 : Math.min(devicePixelRatio || 1, 2)); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); if (!post) post = makePost(renderer, K.scene, camera, w, h); post.setSize(w, h); }
addEventListener('resize', () => { fit(); draw(cur); }); fit();

// ---------- state ----------
const S = { dark: .82, kiosk: 1, neigh: 1, gen: 0, candle: 0, blender: 0, shake: 0, cup: 1, logoB: 0, logoC: 1, cam: { px: 0, py: 0, pz: 0, tx: 0, ty: 0, tz: 0, fov: 30 } };
const c0 = CFG.cam[0]; Object.assign(S.cam, { px: c0[1][0], py: c0[1][1], pz: c0[1][2], tx: c0[2][0], ty: c0[2][1], tz: c0[2][2], fov: c0[3] });

const tl = gsap.timeline({ paused: true });

// kamera: tween antar keyframe
for (let i = 1; i < CFG.cam.length; i++) {
  const [t, p, g, f] = CFG.cam[i], t0 = CFG.cam[i - 1][0];
  tl.to(S.cam, { px: p[0], py: p[1], pz: p[2], tx: g[0], ty: g[1], tz: g[2], fov: f, duration: t - t0, ease: CFG.cam[i][4] || 'power2.inOut' }, t0);
}
// cerita listrik: tetangga padam -> kios berkedip -> genset hidup
const B = CFG.blackout, G = CFG.gensetOn;
tl.set(S, { neigh: .25 }, B - .4).set(S, { neigh: 1 }, B - .33).set(S, { neigh: .15 }, B - .18).set(S, { neigh: 1 }, B - .1).set(S, { neigh: 0 }, B);
tl.to(S, { dark: 1, duration: .8, ease: 'power2.out' }, B);
tl.set(S, { kiosk: .35 }, B).set(S, { kiosk: 0 }, B + .08);
tl.set(S, { gen: 1 }, G).set(S, { kiosk: .5 }, G + .05).set(S, { kiosk: .05 }, G + .13).set(S, { kiosk: .8 }, G + .24).set(S, { kiosk: .3 }, G + .3).set(S, { kiosk: 1 }, G + .4);
tl.to(S, { shake: 1, duration: .05 }, G).to(S, { shake: 0, duration: .9, ease: 'power2.out' }, G + .05);
tl.set(S, { candle: 0 }, 0).to(S, { candle: 1, duration: .35, ease: 'power2.out' }, W(3.2));
tl.set(S, { blender: 1 }, W(22.3)).set(S, { blender: 0 }, W(24.5));
// cup pop saat jus dibahas
tl.fromTo(S, { cup: 1 }, { cup: 1.4, duration: .5, ease: 'back.out(2)', immediateRender: false }, W(28.3));
tl.to(S, { cup: 1.3, duration: 1.5, ease: 'sine.inOut' }, W(29.0));
// logo
tl.to(S, { logoC: 0, duration: .25 }, CFG.endAt - .1);
tl.set('#logoB', { visibility: 'visible' }, CFG.endAt).fromTo('#logoB', { scale: .3, opacity: 0, rotate: -6, transformOrigin: '50% 50%' }, { scale: 1, opacity: 1, rotate: 0, duration: .55, ease: 'back.out(2)' }, CFG.endAt);
tl.set('#fin', { visibility: 'visible' }, CFG.endAt + .35).fromTo('#f2', { opacity: 0, y: '3cqw' }, { opacity: 1, y: 0, duration: .45, ease: 'power2.out' }, CFG.endAt + .35);
tl.set('#logoB', { x: 0 }, 0);
// fade singkat ke hitam saat pindah dari dalam kios ke luar
tl.to('#fade', { opacity: 1, duration: .2, ease: 'power1.in' }, W(30.6) - .2).to('#fade', { opacity: 0, duration: .35, ease: 'power1.out' }, W(30.65) + .02);

// ---------- caption kinetik ----------
const capsEl = document.getElementById('caps');
CFG.caps.forEach(([t0, t1, big, small, L]) => {
  const el = document.createElement('div'); el.className = 'cap';
  const org = L.a === 'right' ? '100%' : L.a === 'center' ? '50%' : '0%';
  el.style.cssText = `left:${L.x}cqw;top:${L.y}cqw;width:${L.w}cqw;text-align:${L.a};transform:rotate(${L.r || 0}deg);transform-origin:${org} 0`;
  el.innerHTML = `<h3 class="big" style="font-size:${L.s || 9.6}cqw">${big}</h3>` + (small ? `<p class="sm">${small}</p>` : '');
  capsEl.appendChild(el);
  const sp = new SplitText(el.querySelector('.big'), { type: 'words', wordsClass: 'wd' });
  sp.words.forEach(w => { if (w.closest('em')) w.classList.add('hl'); });
  tl.set(el, { visibility: 'visible' }, t0);
  tl.fromTo(sp.words, { scale: 0, y: '1.4cqw', rotate: -5, opacity: 0 }, { scale: 1, y: 0, rotate: 0, opacity: 1, duration: .3, ease: 'back.out(2.2)', stagger: .06 }, t0);
  if (small) tl.fromTo(el.querySelector('.sm'), { opacity: 0, y: '2cqw' }, { opacity: 1, y: 0, duration: .35, ease: 'power2.out' }, t0 + .5);
  tl.to(el, { opacity: 0, y: '-1.5cqw', duration: .22, ease: 'power2.in' }, t1 - .22);
  tl.set(el, { visibility: 'hidden' }, t1);
});

// ---------- chip / label ----------
const chipsEl = document.getElementById('chips'); const CHIPS = [];
CFG.chips.forEach(([t0, t1, text, kind, pos]) => {
  const el = document.createElement('div'); el.className = 'chip stk' + (kind === 'fixed' ? ' fixed hl' : ''); el.textContent = text;
  if (kind === 'fixed') { el.style.left = pos[0] + 'cqw'; el.style.top = pos[1] + 'cqw'; }
  chipsEl.appendChild(el); CHIPS.push({ el, t0, t1, kind, pos: kind === 'world' ? new THREE.Vector3(...pos) : null });
  tl.set(el, { visibility: 'visible' }, t0).fromTo(el, { opacity: 0, scale: .6 }, { opacity: 1, scale: 1, duration: .3, ease: 'back.out(2)' }, t0).to(el, { opacity: 0, duration: .2 }, t1 - .2).set(el, { visibility: 'hidden' }, t1);
});

// ---------- kaca cup: transmission hanya saat cup tampil besar (hemat waktu render) ----------
const glass = []; K.cup.traverse(o => { if (o.isMesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m.transmission > 0 && !glass.includes(m)) glass.push(m); }); });
function glassMode(near) { glass.forEach(m => { const w = near ? 1 : 0; if (m.transmission !== w) { m.transmission = w; m.transparent = !near; m.opacity = near ? 1 : .3; m.depthWrite = near; m.needsUpdate = true; } }); }

// ---------- draw ----------
let cur = 0; const _v = new THREE.Vector3();
function draw(t) {
  cur = t;
  K.setState({ dark: S.dark, kiosk: S.kiosk, neigh: S.neigh, gen: S.gen });
  K.smokeUpdate(t, S.gen); K.ex.apply({ dark: S.dark, kiosk: S.kiosk, neigh: S.neigh, gen: S.gen, candle: S.candle, blender: S.blender }, t, CFG.blackout);
  K.GEN.position.y = S.gen * .006 * Math.sin(t * 61) * (t > CFG.gensetOn ? 1 : 0); K.GEN.rotation.z = S.gen * .004 * Math.sin(t * 47 + 1);
  K.cup.scale.setScalar(S.cup); glassMode(t > GL0 && t < GL1);
  const c = S.cam, sh = S.shake * .09 + .012;
  camera.fov = c.fov; camera.position.set(c.px + sh * Math.sin(t * 90), c.py + sh * Math.sin(t * 77 + 2), c.pz); camera.lookAt(c.tx, c.ty, c.tz); camera.updateProjectionMatrix();
  document.getElementById('logoC').style.opacity = S.logoC;
  post.grade.uniforms.uTime.value = t; post.composer.render();
  CHIPS.forEach(ch => { if (ch.kind !== 'world') return; _v.copy(ch.pos).project(camera); ch.el.style.left = ((_v.x * .5 + .5) * 100) + 'cqw'; ch.el.style.top = ((-_v.y * .5 + .5) * stage.clientHeight / stage.clientWidth * 100) + 'cqw'; });
}
window.seek = t => { tl.pause(); tl.time(clamp(t, 0, DUR), false); draw(clamp(t, 0, DUR)); };
window.__DUR = DUR;
window.shotCam = (t, p, g, f) => { seek(t); Object.assign(S.cam, { px: p[0], py: p[1], pz: p[2], tx: g[0], ty: g[1], tz: g[2], fov: f }); draw(t); };

if (!RENDER) { const t0 = performance.now(); const loop = () => { seek(((performance.now() - t0) / 1000) % (DUR + 1.2)); requestAnimationFrame(loop); }; loop(); }
seek(0);
window.__ready = true;
