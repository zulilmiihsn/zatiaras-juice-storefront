// Kios Zatiaras Juice — diorama 3D procedural (Jl. Merah Delima), dibangun dari foto + dua banner asli.
// Satuan ~meter. +x kanan, +y atas, +z menghadap penonton (depan kios).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { setupStudio, makeCup, loadDecal, FRESHJ } from './zatiaras-cup.js';
import { buildInterior } from './interior.js';
import { buildExtras, texAsphalt, texConcrete, texWall, texRoof } from './extras.js';

const C = h => new THREE.Color(h);
function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

export async function buildKiosk(renderer) {
  const R = rng(77);
  const scene = new THREE.Scene();
  const loader = new THREE.TextureLoader();
  const aniso = renderer.capabilities.getMaxAnisotropy();
  const tex = async (u, srgb = true) => { const t = await loader.loadAsync(u); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; return t; };
  const T = {
    banner: await tex('tex/banner.jpg'), sign: await tex('tex/sign.jpg'),
    p1: await tex('tex/poster1.jpg'), p2: await tex('tex/poster2.jpg'), logo: await tex('tex/logo.png'),
  };

  const mats = [];                 // material yang punya mode "nyala" saat blackout
  const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .85, metalness: 0, ...o });
  const add = (m, parent = scene) => { parent.add(m); m.traverse(o => { if (o.isMesh) { o.castShadow = o.userData.noCast ? false : true; o.receiveShadow = true; } }); return m; };
  const box = (w, h, d, mat, x, y, z, parent, r = 0) => {
    const g = r ? new RoundedBoxGeometry(w, h, d, 3, r) : new THREE.BoxGeometry(w, h, d);
    const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); return add(m, parent);
  };
  const cyl = (rt, rb, h, mat, x, y, z, parent, seg = 20) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.position.set(x, y, z); return add(m, parent); };

  // ---------- tanah ----------
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), M(0xffffff, { map: texAsphalt(), roughness: .8 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  // halaman depan (beton lebih terang)
  box(15, .08, 7.5, M(0xffffff, { map: texConcrete(), roughness: .85 }), 0, .04, 5.2, scene);
  // keset hijau di pintu
  box(2.0, .03, 1.0, M(0x2e9e57, { roughness: 1 }), 2.2, .095, 2.75, scene);
  // saluran/got di depan halaman
  box(15, .06, .5, M(0x4c4f53, { roughness: 1 }), 0, .03, 9.2, scene);

  // ---------- badan kios ----------
  const K = new THREE.Group(); scene.add(K);
  const W = 7.6, D = 4.6, H = 3.4, xL = -W / 2, xR = W / 2, zF = D / 2, zB = -D / 2;
  const wallYellow = M(0xffffff, { map: texWall(), roughness: .92 });
  const plinth = M(0xcdbf75, { roughness: .95 });
  const opL = 0.85, opR = 3.45, opW = opR - opL, glassTop = 2.05, glassBot = .22; // bukaan kaca
  // dinding kiri (kosong, kuning)
  box(opL - xL, H, .3, wallYellow, (xL + opL) / 2, H / 2, zF - .15, K);
  // pilar kanan
  box(xR - opR, H, .3, wallYellow, (opR + xR) / 2, H / 2, zF - .15, K);
  // lintel di atas bukaan
  box(opW, H - glassTop, .3, wallYellow, (opL + opR) / 2, (H + glassTop) / 2, zF - .15, K);
  // dasar di bawah kaca
  box(opW, glassBot, .3, wallYellow, (opL + opR) / 2, glassBot / 2, zF - .15, K);
  // plint
  box(W + .1, .16, .06, plinth, 0, .08, zF + .02, K);
  // dinding samping & belakang
  box(.3, H, D, wallYellow, xL + .15, H / 2, 0, K);
  box(.3, H, D, wallYellow, xR - .15, H / 2, 0, K);
  box(W, H, .3, M(0xe9731c, { roughness: .9 }), 0, H / 2, zB + .15, K);
  // lantai dalam
  box(W - .6, .06, D - .3, M(0xd8a845, { roughness: .6 }), 0, .1, -.05, K);
  // plafon dalam
  box(W - .6, .08, D - .3, M(0xf2ece0, { roughness: .9 }), 0, H - .1, -.05, K);

  // ---------- atap seng bergelombang ----------
  {
    const rw = W + .9, rd = D + 1.3;
    const g = new THREE.PlaneGeometry(rw, rd, 360, 2); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, Math.sin(x * 22) * .035 + (-z) * .07); }
    g.computeVertexNormals();
    const roofMat = new THREE.MeshStandardMaterial({ map: texRoof(), roughness: .55, metalness: .45, side: THREE.DoubleSide });
    const roof = new THREE.Mesh(g, roofMat); roof.position.set(0, H + .28, .35); add(roof, K);
    box(rw, .1, rd, M(0x6f3b2c, { metalness: .3 }), 0, H + .2, .35, K);
    // list biru di bawah atap (fascia)
    box(W + .6, .22, .1, M(0x2f8fd6, { roughness: .6 }), 0, H + .09, zF + .45, K);
    // karat/noda di sisi
    box(.08, .22, D + 1.0, M(0x2f8fd6, { roughness: .6 }), xL - .25, H + .09, .1, K);
  }

  // ---------- kaca + rangka ----------
  const alu = M(0xb7bdc4, { metalness: .7, roughness: .35 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xbfe3ee, roughness: .05, metalness: .2, transparent: true, opacity: .16, depthWrite: false });
  const gh = glassTop - glassBot, gy = (glassTop + glassBot) / 2;
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(opW, gh), glassMat); glass.position.set((opL + opR) / 2, gy, zF - .06); K.add(glass);
  [opL, opL + opW * .34, opL + opW * .67, opR].forEach(x => box(.07, gh, .1, alu, x, gy, zF - .04, K));
  box(opW, .07, .1, alu, (opL + opR) / 2, glassTop, zF - .04, K); box(opW, .07, .1, alu, (opL + opR) / 2, glassBot + .03, zF - .04, K);
  box(opW, .05, .08, alu, (opL + opR) / 2, 1.0, zF - .04, K);
  // gagang pintu (panel tengah)
  box(.04, .5, .05, M(0x444a50, { metalness: .8, roughness: .3 }), opL + opW * .34 + .12, 1.05, zF + .02, K);

  // ---------- interior ----------
  const IN = new THREE.Group(); K.add(IN);
  const inter = await buildInterior({ scene, renderer, K, IN });
  const { lampMat, tvMat, cup } = inter;

  // ---------- banner magenta (asli) + papan hijau (asli) ----------
  const bw = 3.3, bh = bw / 3.0, bx = (opL + opR) / 2 + .2, by = glassTop + bh / 2 + .14;
  const bannerMat = new THREE.MeshStandardMaterial({ map: T.banner, roughness: .55, emissive: 0xffffff, emissiveMap: T.banner, emissiveIntensity: 0 });
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), bannerMat); banner.position.set(bx, by, zF + .05); add(banner, K); mats.push(bannerMat);
  box(bw + .1, bh + .1, .05, M(0xdedede, { roughness: .5 }), bx, by, zF + .015, K);
  const sw = 1.95, sh = sw / 2, sx = bx + .35, sy = H + .42 + sh / 2 + .25;
  const signMat = new THREE.MeshStandardMaterial({ map: T.sign, roughness: .55, emissive: 0xffffff, emissiveMap: T.sign, emissiveIntensity: 0 });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), signMat); sign.position.set(sx, sy, zF + .52); add(sign, K); mats.push(signMat);
  box(sw + .08, sh + .08, .06, M(0xe4e4e4, { roughness: .5 }), sx, sy, zF + .48, K);
  [-.7, .7].forEach(dx => box(.05, sh * .45, .05, alu, sx + dx, sy - sh / 2 - .1, zF + .48, K));
  // lampu sorot kecil di atas banner (tampak saat blackout)
  const spotMat = new THREE.MeshStandardMaterial({ color: 0xfff1d0, emissive: 0xffe3a8, emissiveIntensity: 0 }); mats.push(spotMat);
  [-1.1, 0, 1.1].forEach(dx => { const s = cyl(.05, .07, .14, spotMat, bx + dx, by + bh / 2 + .2, zF + .35, K, 10); s.rotation.x = .5; });

  // ---------- dinding kiri: poster, papan, kaktus ----------
  const flat = (w, h, map, x, y, z, parent, emi = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map, roughness: .6 })); m.position.set(x, y, z); return add(m, parent); };
  flat(.78, .78 * 456 / 480, T.p1, -3.15, 1.65, zF + .015, K); box(.84, .84 * 456 / 480 + .06, .02, M(0xffffff), -3.15, 1.65, zF + .005, K);
  flat(.62, .62 * 462 / 480, T.p2, -.35, 1.55, zF + .015, K);
  // papan abu muda (ikon senyum)
  const [sc, sx2] = cv(512, 300); sx2.fillStyle = '#e6e6e4'; sx2.fillRect(0, 0, 512, 300); sx2.strokeStyle = '#9aa0a4'; sx2.lineWidth = 8; sx2.strokeRect(10, 10, 492, 280);
  sx2.beginPath(); sx2.arc(256, 130, 46, 0, 7); sx2.stroke(); sx2.beginPath(); sx2.arc(256, 140, 26, .15 * Math.PI, .85 * Math.PI); sx2.stroke(); sx2.fillStyle = '#9aa0a4'; sx2.fillRect(232, 112, 10, 10); sx2.fillRect(272, 112, 10, 10);
  const sT = new THREE.CanvasTexture(sc); sT.colorSpace = THREE.SRGBColorSpace; flat(1.25, 1.25 * 300 / 512, sT, -1.75, 2.0, zF + .015, K);
  // kotak kecil putih di atas
  box(.4, .38, .02, M(0xf2f2f0), -2.0, 2.95, zF + .01, K);
  // kaktus
  const cactMat = M(0x4a8f55, { roughness: .8 });
  [[-.35, 1.0, .12], [-1.15, 1.3, .13], [-2.55, .85, .11]].forEach(([x, h, r]) => {
    const c = cyl(r, r * 1.02, h, cactMat, x, h / 2, zF + .5, scene, 14); c.geometry.scale(1, 1, 1);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; const rib = box(.018, h * .96, .018, M(0x3b7a47), x + Math.cos(a) * r, h / 2, zF + .5 + Math.sin(a) * r, scene); }
  });

  // ---------- genset portabel rangka terbuka (alasan video ini) ----------
  function V(x, y, z) { return new THREE.Vector3(x, y, z); }
  const GEN = new THREE.Group(); scene.add(GEN); GEN.position.set(4.9, .08, 1.7);          // berdiri di atas halaman (permukaan y=.08), bukan tertanam
  const ledMat = new THREE.MeshStandardMaterial({ color: 0x41ff7a, emissive: 0x41ff7a, emissiveIntensity: 0 });
  {
    const fr = M(0xf0a21a, { roughness: .38, metalness: .35 }), blk = M(0x1d2024, { roughness: .55, metalness: .2 }), stl = M(0xb9bec4, { roughness: .32, metalness: .9 }), red = M(0xc9302c, { roughness: .4, metalness: .1 }), gry = M(0x2a2e33, { roughness: .6 });
    const tube = (a, b) => { const A = V(...a), B = V(...b), len = A.distanceTo(B); const m = new THREE.Mesh(new THREE.CylinderGeometry(.016, .016, len, 10), fr); m.position.copy(A.clone().add(B).multiplyScalar(.5)); m.quaternion.setFromUnitVectors(V(0, 1, 0), B.clone().sub(A).normalize()); m.castShadow = true; GEN.add(m); };
    const X = .46, Z = .3, Y0 = .07, Y1 = .76;
    [[-X, -Z], [X, -Z], [-X, Z], [X, Z]].forEach(([x, z]) => { tube([x, Y0, z], [x, Y1, z]); const f = new THREE.Mesh(new THREE.CylinderGeometry(.032, .038, .06, 14), blk); f.position.set(x, .03, z); f.castShadow = true; GEN.add(f); const j = new THREE.Mesh(new THREE.SphereGeometry(.02, 10, 8), fr); j.position.set(x, Y1, z); GEN.add(j); const j2 = j.clone(); j2.position.y = Y0; GEN.add(j2); });
    [Y0, Y1].forEach(y => { tube([-X, y, -Z], [X, y, -Z]); tube([-X, y, Z], [X, y, Z]); tube([-X, y, -Z], [-X, y, Z]); tube([X, y, -Z], [X, y, Z]); });
    box(.9, .03, .56, blk, 0, .1, 0, GEN, .006);
    const eng = cyl(.14, .14, .3, M(0x3a3f45, { roughness: .45, metalness: .5 }), .2, .34, -.02, GEN, 28); eng.rotation.z = Math.PI / 2;
    for (let i = 0; i < 6; i++) { const fin = cyl(.158, .158, .012, M(0x4a5057, { roughness: .4, metalness: .6 }), .09 + i * .05, .34, -.02, GEN, 28); fin.rotation.z = Math.PI / 2; }
    box(.17, .14, .22, blk, .2, .5, -.02, GEN, .015); cyl(.012, .012, .08, stl, .2, .6, -.02, GEN, 8); box(.14, .02, .2, M(0x2c3035), .2, .575, -.02, GEN);
    const alt = cyl(.19, .19, .27, red, -.2, .36, 0, GEN, 36); alt.rotation.z = Math.PI / 2; for (let i = 0; i < 5; i++) { const rib = cyl(.196, .196, .01, blk, -.3 + i * .05, .36, 0, GEN, 36); rib.rotation.z = Math.PI / 2; } const cap = cyl(.12, .12, .03, blk, -.345, .36, 0, GEN, 28); cap.rotation.z = Math.PI / 2;
    box(.34, .12, .22, red, 0, .67, -.06, GEN, .035); const tc = cyl(.035, .035, .03, stl, -.08, .745, -.06, GEN, 16); tc.castShadow = true;
    // panel kontrol depan (+z): 2 stopkontak, breaker, display, LED
    box(.62, .27, .03, gry, -.05, .34, .3, GEN, .008); box(.62, .012, .035, fr, -.05, .475, .3, GEN);
    [-.27, -.14].forEach(x => { const so = cyl(.034, .034, .012, M(0xe9e9e6, { roughness: .4 }), x, .31, .32, GEN, 20); so.rotation.x = Math.PI / 2; [-.011, .011].forEach(dx => box(.005, .016, .006, blk, x + dx, .31, .327, GEN)); });
    box(.05, .04, .02, red, .04, .31, .32, GEN, .004); box(.06, .035, .01, M(0x0a0f12, { emissive: 0x1d6a4a, emissiveIntensity: .6 }), .15, .37, .318, GEN); const ld = new THREE.Mesh(new THREE.SphereGeometry(.012, 10, 8), ledMat); ld.position.set(.15, .31, .32); GEN.add(ld);
    box(.12, .18, .1, red, X + .0, .4, .02, GEN, .02); const pc = cyl(.012, .012, .08, blk, X + .08, .38, .02, GEN, 10); pc.rotation.z = Math.PI / 2;
    const mf = cyl(.055, .055, .26, stl, .3, .27, -.2, GEN, 22); mf.rotation.z = Math.PI / 2; cyl(.014, .014, .62, stl, .43, .56, -.2, GEN, 10);
    [-1, 1].forEach(sz => { const w = new THREE.Group(); const tr = new THREE.Mesh(new THREE.TorusGeometry(.07, .028, 12, 24), blk); tr.rotation.y = Math.PI / 2; w.add(tr); const hub = cyl(.05, .05, .04, stl, 0, 0, 0, w, 16); hub.rotation.z = Math.PI / 2; w.position.set(-X - .02, .1, sz * .28); GEN.add(w); });
  }
  const smoke = []; for (let i = 0; i < 10; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ color: 0x70757b, transparent: true, opacity: 0, depthWrite: false })); GEN.add(m); smoke.push(m); }
  function smokeUpdate(t, run) { smoke.forEach((m, i) => { const ph = ((t * .45 + i / smoke.length) % 1); m.position.set(.43 + Math.sin(ph * 5 + i) * .1 + ph * .35, .9 + ph * 1.4, -.2); m.scale.setScalar(.05 + ph * .22); m.material.opacity = run * (1 - ph) * .2; }); }
  // kabel: dari stopkontak genset, tergeletak di atas halaman (y >= .105), naik rapi di dinding ke panel
  { const p = [V(4.66, .34, 2.06), V(4.66, .27, 2.2), V(4.6, .15, 2.42), V(4.35, .108, 2.62), V(3.95, .108, 2.66), V(3.72, .14, 2.56), V(3.64, .5, 2.47), V(3.62, .99, 2.4)];
    const cable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(p), 80, .02, 10), M(0x15171a, { roughness: .45 })); cable.castShadow = true; scene.add(cable);
    const plug = cyl(.026, .026, .06, M(0x15171a, { roughness: .4 }), 4.66, .34, 2.1, scene, 14); plug.rotation.x = Math.PI / 2;
    [[3.64, .35, 2.42], [3.63, .7, 2.41]].forEach(([x, y, z]) => box(.05, .03, .02, M(0xcfd3d6, { roughness: .4 }), x, y, z, scene, .004)); }

  // ---------- lingkungan: bangunan tetangga polos + lampu jalan ----------
  const neighMat = [M(0x7d8a93), M(0x9a8f85), M(0x6c7a86)];
  const poleM = M(0x8a8f94, { roughness: .8 });
  // lampu jalan dekat (mati)
  cyl(.06, .08, 5.2, poleM, -3.6, 2.6, 7.5, scene, 8); box(.9, .1, .1, poleM, -3.15, 5.2, 7.5, scene);
  const sl = box(.4, .1, .22, M(0xdfe3e6, { roughness: .4 }), -2.75, 5.15, 7.5, scene);
  // jendela tetangga (bisa menyala/mati)
  const winMat = new THREE.MeshStandardMaterial({ color: 0x3a444d, roughness: .15, metalness: .1, emissive: 0xffd58a, emissiveIntensity: 0 });
  const bulbMat = new THREE.MeshStandardMaterial({ color: 0xdfe3e6, emissive: 0xffe2b0, emissiveIntensity: 0, roughness: .4 });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(.13, 12, 8), bulbMat); bulb.position.set(-2.75, 5.05, 7.5); scene.add(bulb);
  const streetPt = new THREE.PointLight(0xffe2b0, 0, 18, 1.5); streetPt.position.set(-2.75, 4.8, 7.9); scene.add(streetPt);

  // ---------- cahaya ----------
  const hemi = new THREE.HemisphereLight(0xcfe6ff, 0x7a7466, 1.0); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1d8, 3.0); sun.position.set(10, 16, 14); sun.castShadow = false;
  sun.shadow.mapSize.set(2048, 2048); const sc2 = sun.shadow.camera; sc2.left = -16; sc2.right = 16; sc2.top = 16; sc2.bottom = -16; sc2.near = 1; sc2.far = 60; sun.shadow.bias = -.0004; sun.shadow.normalBias = .03; scene.add(sun);
  const moon = new THREE.DirectionalLight(0x6f8fd6, 0); moon.position.set(-9, 14, 10); scene.add(moon);
  const inLight = []; // cahaya interior kios
  [[-2.0, 2.8, -.2], [1.2, 2.8, .2]].forEach(([x, y, z]) => { const l = new THREE.PointLight(0xffd9a0, 0, 7, 1.6); l.position.set(x, y, z); K.add(l); inLight.push(l); });
  const bannerSpot = new THREE.SpotLight(0xfff0d0, 0, 12, .9, .7, 1.2); bannerSpot.position.set(bx, by + 1.4, zF + 2.2); bannerSpot.target.position.set(bx, by, zF); scene.add(bannerSpot, bannerSpot.target);
  const signSpot = new THREE.SpotLight(0xfff0d0, 0, 14, .7, .8, 1.2); signSpot.position.set(sx, sy + .8, zF + 3); signSpot.target.position.set(sx, sy, zF); scene.add(signSpot, signSpot.target);
  const genGlow = new THREE.PointLight(0xffb060, 0, 5, 2); genGlow.position.set(4.7, .9, 2.4); scene.add(genGlow);
  const spill = { intensity: 0 };

  // ---------- state: dark 0..1 (siang..malam), kiosk 0..1 (listrik kios), neigh 0..1 (lampu tetangga/jalan), gen 0..1 ----------
  function setState({ dark = 1, kiosk = 1, neigh = 0, gen = 1 } = {}) {
    const t = dark, L = (a, c) => a + (c - a) * t;
    sun.intensity = L(3.0, 0); hemi.intensity = L(1.0, .16); moon.intensity = L(0, .55);
    hemi.color.set(0xcfe6ff).lerp(C(0x2a3a66), t); hemi.groundColor.set(0x7a7466).lerp(C(0x161a28), t);
    scene.background = C(0xa9d4f2).lerp(C(0x070a14), t);
    scene.fog = new THREE.Fog(C(0xcfe3f0).lerp(C(0x070a14), t).getHex(), 24, 70);
    renderer.toneMappingExposure = L(1.0, 1.15);
    inLight.forEach(l => l.intensity = kiosk * t * 6);
    bannerSpot.intensity = kiosk * t * 9; signSpot.intensity = kiosk * t * 10; spill.intensity = kiosk * t * 5;
    genGlow.intensity = gen * t * 3;
    bannerMat.emissiveIntensity = kiosk * t * .32; signMat.emissiveIntensity = kiosk * t * .3;
    lampMat.emissiveIntensity = .05 + kiosk * L(.65, 1.4); spotMat.emissiveIntensity = kiosk * t * 2.2; tvMat.emissiveIntensity = kiosk * .8;
    winMat.emissiveIntensity = neigh * 1.5; bulbMat.emissiveIntensity = neigh * 3; streetPt.intensity = neigh * 26;
    ledMat.emissiveIntensity = gen * 1.8;
    ground.material.color.set(0xffffff).lerp(C(0x4a4c52), t);
  }
  const setMode = (m) => setState({ dark: m === 'blackout' ? 1 : 0, kiosk: 1, neigh: 0, gen: 1 });
  setMode('siang');
  const ex = await buildExtras({ scene, renderer, K, IN });
  { const exA = ex.apply; ex.apply = (st, t, B) => { exA(st, t, B); inter.apply(st, t); }; }
  return { scene, setMode, setState, smokeUpdate, GEN, cup, K, ex, bounds: { zF, opL, opR, bx, by, sx, sy, H } };
}
