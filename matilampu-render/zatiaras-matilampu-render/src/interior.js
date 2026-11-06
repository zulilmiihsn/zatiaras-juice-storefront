// interior.js — interior Zatiaras Juice mengikuti layout asli (video kios):
// bar marmer memanjang di dinding KIRI menghadap ke KANAN, kulkas pajangan merah di ujung depan bar, dinding ubin abu + list kuning,
// dinding belakang oranye + tirai merah + TV menu, rak buah miring yang tertata, meja kayu + bangku putih.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { rng, cv, tex, rep, plain, setEnv, ENV_K, marble, tiles, wood, steel, floorTile, paint, rattan, fabric } from './mat.js';
import { strawberry, mango, avocado, avocadoHalf, papaya, orange, apple, centered } from './fruits.js';
import { setupStudio, makeCup, loadDecal, FRESHJ } from './zatiaras-cup.js';

export async function buildInterior({ scene, renderer, K, IN }) {
  const R = rng(99);
  const pm = new THREE.PMREMGenerator(renderer); const env = pm.fromScene(new RoomEnvironment(), .04).texture; pm.dispose(); setEnv(env);
  const FL = .13, CE = 3.26, LX = -3.5, RX = 3.5, BZ = -2.0, FZ = 2.0, BT = 1.13;

  // ---------- helper ----------
  const put = (o, p = IN) => { p.add(o); o.traverse(c => { if (c.isMesh) { c.castShadow = false; c.receiveShadow = true; } }); return o; };
  const bx = (w, h, d, mat, x, y, z, p = IN, r = 0) => { const m = new THREE.Mesh(r ? new RoundedBoxGeometry(w, h, d, 3, r) : new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return put(m, p); };
  const cy = (rt, rb, h, mat, x, y, z, p = IN, seg = 28) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.position.set(x, y, z); return put(m, p); };
  const pl = (w, h, mat, x, y, z, rx = 0, ry = 0, p = IN) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); return put(m, p); };
  const lathe = (pts, mat, seg = 36) => new THREE.Mesh(new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), seg), mat);
  const glass = (op = .16, tint = 0xeaf6fb) => new THREE.MeshPhysicalMaterial({ color: tint, transparent: true, opacity: op, roughness: .05, metalness: 0, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false, envMap: env, envMapIntensity: .8 * ENV_K });
  const lin = (a, b, n) => Array.from({ length: n }, (_, i) => n === 1 ? (a + b) / 2 : a + (b - a) * i / (n - 1));
  const MARBLE = marble(), TILE = tiles(), WOOD = wood(), STEEL = steel(), FLOORM = floorTile(), RATTAN = rattan();
  const dark = plain(0x1b1d22, { roughness: .5 }), white = plain(0xf3f3f1, { roughness: .35 });
  const pn = (c, s, w, h) => rep(paint(c, s), w / .8, h / .8);

  // ---------- permukaan ruangan ----------
  pl(7, 4, rep(FLOORM, 7 / 1.2, 4 / 1.2), 0, FL + .002, 0, -Math.PI / 2, 0);
  pl(4, 2.5, rep(TILE, 4 / .8, 2.5 / .8), LX + .004, FL + 1.25, 0, 0, Math.PI / 2);          // ubin dinding kiri (menghadap +x)
  pl(4, .63, pn('#d8c72c', 4, 4, .63), LX + .004, 2.63 + .315, 0, 0, Math.PI / 2);          // list kuning
  pl(7, 3.13, pn('#e9701a', 2, 7, 3.13), 0, FL + 1.565, BZ + .004, 0, 0);                    // dinding belakang oranye
  pl(4, 3.13, pn('#efe6c4', 6, 4, 3.13), RX - .004, FL + 1.565, 0, 0, -Math.PI / 2);
  pl(4.35, 3.13, pn('#efe6c4', 7, 4.35, 3.13), -1.325, FL + 1.565, FZ - .004, 0, Math.PI);
  pl(2.6, 1.25, pn('#efe6c4', 8, 2.6, 1.25), 2.15, 2.64, FZ - .004, 0, Math.PI);
  pl(7, 4, pn('#f4f1ea', 4, 7, 4), 0, CE - .003, 0, Math.PI / 2, 0);
  // lampu panel LED plafon
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xfff4d6, emissive: 0xffe9bd, emissiveIntensity: 1 });
  [[-1.9, -.9], [-1.9, .7], [1.2, -.9], [1.2, .7]].forEach(([x, z]) => { bx(1.1, .03, .14, lampMat, x, CE - .02, z); bx(1.16, .02, .2, white, x, CE - .006, z); });

  // ---------- bar marmer di dinding kiri, menghadap kanan ----------
  const BZ0 = 1.08, LEN = BZ0 - BZ, ZC = (BZ0 + BZ) / 2, BX = LX + .48;
  bx(.95, BT - .05 - FL, LEN, plain(0xdddddb), LX + .475, FL + (BT - .05 - FL) / 2, ZC);
  bx(.9, .08, LEN - .02, dark, LX + .45, FL + .04, ZC);
  pl(LEN, BT - .05 - .21, rep(MARBLE, LEN / 1.2, (BT - .26) / 1.2), -2.549, .21 + (BT - .26) / 2 + .0, ZC, 0, Math.PI / 2);
  bx(1.0, .05, LEN + .02, rep(MARBLE, .4, .12), LX + .5, BT - .025, ZC);
  pl(1.0, LEN + .02, rep(MARBLE, 1.0 / 1.2, LEN / 1.2), LX + .5, BT + .001, ZC, -Math.PI / 2, 0);
  [-.55, -1.05, -1.55].forEach(z => { bx(.006, .8, .006, dark, -2.547, .66, z); bx(.014, .26, .024, STEEL, -2.54, .8, z + .08, IN, .006); });

  // ---------- kulkas pajangan merah (menghadap +x) ----------
  const fridgeLed = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xf4fbff, emissiveIntensity: 0 });
  const bottleGeo = new THREE.LatheGeometry([[0, 0], [.027, 0], [.03, .01], [.03, .1], [.022, .13], [.012, .16], [.012, .185], [.014, .19], [0, .19]].map(p => new THREE.Vector2(p[0], p[1])), 20);
  const bottle = (c) => { const g = new THREE.Group(); g.add(new THREE.Mesh(bottleGeo, glass(.28, 0xdff0f5))); const l = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, .1, 18), plain(c, { roughness: .25 })); l.position.y = .06; g.add(l); const cp = new THREE.Mesh(new THREE.CylinderGeometry(.013, .013, .012, 12), plain(0xf0f0f0)); cp.position.y = .194; g.add(cp); return g; };
  const cupP = (c) => { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.CylinderGeometry(.034, .026, .11, 18), plain(c, { roughness: .3 }))); const ld = new THREE.Mesh(new THREE.CylinderGeometry(.037, .037, .01, 18), plain(0xf3f3f3, { roughness: .3 })); ld.position.y = .06; g.add(ld); g.children[0].position.y = .055; return g; };
  const boxP = (c) => { const m = new THREE.Mesh(new RoundedBoxGeometry(.11, .07, .09, 2, .008), plain(c, { roughness: .45 })); m.position.y = .035; const g = new THREE.Group(); g.add(m); return g; };
  function fridge() {
    const g = new THREE.Group(), w = .78, d = .68, h = 2.0, t = .035;
    const frame = plain(0x7d0e28, { roughness: .32, metalness: .1, envI: .8 }), inner = plain(0xf4f4f2, { roughness: .4 });
    bx(w, h, .02, inner, 0, h / 2, -d / 2 + .01, g); bx(t, h, d, frame, -w / 2 + t / 2, h / 2, 0, g, .006); bx(t, h, d, frame, w / 2 - t / 2, h / 2, 0, g, .006);
    bx(w, .12, d, frame, 0, h - .06, 0, g, .01); bx(w, .1, d, frame, 0, .05, 0, g);
    bx(w, .08, .04, frame, 0, h - .16, d / 2 - .02, g, .006); bx(w, .05, .04, frame, 0, .14, d / 2 - .02, g, .006);
    bx(.06, h - .3, .04, frame, -w / 2 + .03, h / 2, d / 2 - .02, g, .006); bx(.06, h - .3, .04, frame, w / 2 - .03, h / 2, d / 2 - .02, g, .006);
    pl(w - .1, h - .3, glass(.1), 0, h / 2, d / 2 - .015, 0, 0, g);
    bx(.025, .8, .035, STEEL, w / 2 - .075, h / 2, d / 2 + .012, g, .01);
    bx(w - .12, .014, .025, fridgeLed, 0, h - .2, d / 2 - .06, g); bx(.014, h - .5, .02, fridgeLed, -w / 2 + .06, h / 2, d / 2 - .07, g);
    const fan = cy(.085, .085, .012, dark, 0, h - .24, -.1, g, 28); fan.rotation.x = Math.PI / 2; for (let i = 0; i < 4; i++) { const rr = new THREE.Mesh(new THREE.TorusGeometry(.015 + i * .02, .002, 6, 28), STEEL); rr.position.set(0, h - .24, -.092); g.add(rr); }
    const ys = [.34, .66, .98, 1.3, 1.62], cols = [0xe84a5f, 0xf2b134, 0x6cc24a, 0xd0287f, 0xf7d84a, 0x8d3fb0];
    ys.forEach((y, i) => { bx(w - .1, .012, d - .1, rep(STEEL, 1, 1), 0, y, 0, g); for (let k = 0; k < 7; k++) { const z = -d / 2 + .08 + k * (d - .16) / 6; bx(w - .1, .004, .004, STEEL, 0, y + .008, z, g); }
      for (const rz of [d / 2 - .16, -.02]) lin(-.27, .27, i === 2 ? 5 : 6).forEach((x, k) => { const it = i % 2 === 0 ? (i === 4 ? boxP([0xf6e3c8, 0xe9a8b5, 0xcfe7c8][k % 3]) : cupP(cols[(k + i) % 6])) : bottle(cols[(k + i * 2) % 6]); it.position.set(x, y + .006, rz); g.add(it); }); });
    g.position.y = FL; return put(g);
  }
  { const f = fridge(); f.position.set(LX + .02 + .34, FL, 1.57); f.rotation.y = Math.PI / 2; }

  // ---------- wadah transparan berisi potongan buah (tertata) ----------
  function tub(w, h, d, color, cs) {
    const g = new THREE.Group(), nx = Math.floor((w - .02) / cs), nz = Math.floor((d - .02) / cs), ny = Math.floor((h - .03) / cs), n = nx * ny * nz;
    const im = new THREE.InstancedMesh(new RoundedBoxGeometry(cs * .94, cs * .9, cs * .94, 2, cs * .18), plain(color, { roughness: .32, envI: .6 }), n), mm = new THREE.Matrix4(); let q = 0;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) { mm.makeTranslation(-w / 2 + .012 + cs * (i + .5), .012 + cs * (j + .5), -d / 2 + .012 + cs * (k + .5)); im.setMatrixAt(q++, mm); }
    g.add(im); const body = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, .012), glass(.2)); body.position.y = h / 2; g.add(body);
    const lid = new THREE.Mesh(new RoundedBoxGeometry(w + .008, .014, d + .008, 2, .005), plain(0xe6edf0, { roughness: .35, transparent: true, opacity: .75 })); lid.position.y = h + .005; g.add(lid); return g;
  }
  // ---------- item di atas bar (semua tertata rapi) ----------
  const base = new THREE.Group(); base.position.set(0, BT, 0); IN.add(base);
  { // keranjang rotan + pepaya utuh
    const bk = new THREE.Mesh(new THREE.CylinderGeometry(.19, .14, .12, 36, 1, true), (() => { const m = rep(RATTAN, 6, 1.5); m.side = THREE.DoubleSide; return m; })()); bk.position.set(-3.05, .06, .9); put(bk, base);
    cy(.14, .14, .01, rep(RATTAN, 2, 2), -3.05, .005, .9, base, 28); const rm = new THREE.Mesh(new THREE.TorusGeometry(.19, .012, 8, 36), rep(RATTAN, 4, 1)); rm.rotation.x = Math.PI / 2; rm.position.set(-3.05, .12, .9); put(rm, base);
    const pp = centered(papaya(), .26); pp.position.set(-3.05, .13, .9); pp.rotation.set(0, .5, Math.PI / 2 - .08); put(pp, base);
  }
  { const g = new THREE.Group(); g.position.set(-3.18, 0, .52); const b = new THREE.Mesh(new RoundedBoxGeometry(.27, .12, .27, 3, .02), plain(0x82d03a, { roughness: .35 })); b.position.y = .06; g.add(b); const l = new THREE.Mesh(new RoundedBoxGeometry(.285, .035, .285, 3, .014), plain(0x6bb82a, { roughness: .4 })); l.position.y = .14; g.add(l); const k = new THREE.Mesh(new THREE.CylinderGeometry(.02, .025, .02, 12), plain(0x6bb82a)); k.position.y = .17; g.add(k); put(g, base); }
  // talenan + alpukat belah (rapi, sejajar) + pisau
  bx(.25, .022, .36, rep(WOOD, .4, .5), -2.9, .011, .2, base, .006);
  { const h1 = avocadoHalf(61), h2 = avocadoHalf(62); h2.children.forEach(c => { if (c.geometry && c.geometry.type === 'SphereGeometry') c.visible = false; });
    [[h1, -2.96], [h2, -2.84]].forEach(([h, x]) => { const gp = new THREE.Group(); h.position.y = -.076; gp.add(h); gp.position.set(x, .022 + .055, .2); gp.rotation.set(-Math.PI / 2, 0, 0); put(gp, base); });
    const kn = new THREE.Group(); const bl = bx(.04, .003, .2, rep(STEEL, 1, 1), 0, .004, .05, kn); bx(.02, .016, .12, dark, 0, .01, -.1, kn, .006); kn.position.set(-2.72, .022, .22); kn.rotation.y = .06; put(kn, base); }
  // blender
  const BLX = -3.14, BLZ = -.28; const bl = new THREE.Group(); bl.position.set(BLX, 0, BLZ); put(bl, base);
  const blLed = new THREE.MeshStandardMaterial({ color: 0xff3030, emissive: 0xff3030, emissiveIntensity: 0 });
  { const red = plain(0xc0202f, { roughness: .28, metalness: .15, envI: .9 });
    bx(.22, .16, .22, red, 0, .08, 0, bl, .03); bx(.17, .06, .02, dark, 0, .075, .108, bl, .006); bx(.24, .018, .24, rep(STEEL, 1, 1), 0, .17, 0, bl, .008);
    [-.05, .0, .05].forEach(x => cy(.013, .013, .012, STEEL, x, .075, .122, bl, 14).rotation.x = Math.PI / 2); const led = new THREE.Mesh(new THREE.SphereGeometry(.007, 8, 8), blLed); led.position.set(.07, .105, .112); bl.add(led);
    const jar = lathe([[0, 0], [.055, 0], [.062, .02], [.095, .3], [.1, .335]], glass(.2, 0xf4fbff), 40); jar.position.y = .18; jar.renderOrder = 3; bl.add(jar);
    const vt = (() => { const [c, x] = cv(256, 64); x.fillStyle = '#efe08a'; x.fillRect(0, 0, 256, 64); for (let i = 0; i < 9; i++) { x.fillStyle = i % 2 ? 'rgba(255,250,190,.7)' : 'rgba(225,190,70,.55)'; x.beginPath(); x.moveTo(i * 28, 0); x.lineTo(i * 28 + 22, 0); x.lineTo(i * 28 + 8, 64); x.lineTo(i * 28 - 14, 64); x.fill(); } return tex(c, true, [2, 1]); })();
    bl.userData.vt = vt; const liq = lathe([[0, 0], [.05, 0], [.057, .02], [.082, .22], [.0845, .24], [0, .24]], plain(0xffffff, { map: vt, roughness: .3 }), 40); liq.material.map = vt; liq.position.y = .2; bl.add(liq);
    const bladeG = new THREE.Group(); bladeG.position.y = .19; bl.add(bladeG); bl.userData.bladeG = bladeG; for (let i = 0; i < 2; i++) { const b = bx(.13, .004, .02, STEEL, 0, 0, 0, bladeG); b.rotation.y = i * Math.PI / 2; }
    cy(.108, .108, .03, dark, 0, .5, 0, bl, 32); cy(.03, .03, .03, dark, 0, .53, 0, bl, 20);
    const hd = new THREE.Mesh(new THREE.TorusGeometry(.075, .012, 8, 18, Math.PI), dark); hd.position.set(.095, .36, 0); hd.rotation.set(0, Math.PI / 2, -Math.PI / 2); put(hd, bl); }
  // wadah buah potong (tertata): semangka, mangga, melon hijau
  [[-1.0, 0xe0363f, .034], [-1.3, 0xf2b230, .03], [-1.6, 0xa9d472, .03]].forEach(([z, c, cs]) => { const t = tub(.26, .15, .19, c, cs); t.position.set(-3.17, 0, z); t.rotation.y = Math.PI / 2; put(t, base); });
  // punnet stroberi tertata rapi (3x3)
  { const g = new THREE.Group(); g.position.set(-2.82, 0, -.98); const body = new THREE.Mesh(new RoundedBoxGeometry(.17, .06, .17, 3, .01), glass(.22)); body.position.y = .03; g.add(body);
    lin(-.045, .045, 3).forEach(x => lin(-.045, .045, 3).forEach(z => { const s = strawberry(80 + (x * 100 | 0) + (z * 33 | 0)); s.scale.setScalar(.8); s.position.set(x, .018, z); s.rotation.x = Math.PI; s.position.y = .052; g.add(s); })); put(g, base); }

  // ---------- rak dinding: boks sereal, toples, mangkuk anyam ----------
  bx(.24, .03, 2.5, rep(WOOD, 1.6, .2), LX + .13, 1.78, -.2, IN, .006); [.95, -1.35].forEach(z => bx(.03, .12, .14, STEEL, LX + .04, 1.7, z));
  const pack = (c1, c2, label) => { const [c, x] = cv(256, 340); x.fillStyle = c1; x.fillRect(0, 0, 256, 340); const g = x.createLinearGradient(0, 0, 0, 340); g.addColorStop(0, 'rgba(255,255,255,.18)'); g.addColorStop(1, 'rgba(0,0,0,.2)'); x.fillStyle = g; x.fillRect(0, 0, 256, 340); x.fillStyle = c2; x.beginPath(); x.ellipse(128, 190, 92, 62, 0, 0, 7); x.fill(); x.fillStyle = 'rgba(255,255,255,.35)'; x.beginPath(); x.ellipse(128, 176, 74, 40, 0, 0, 7); x.fill();
    for (let i = 0; i < 30; i++) { x.fillStyle = ['#8c3b1e', '#d94a3a', '#e8c15a', '#6d8f3c'][i % 4]; x.beginPath(); x.arc(70 + R() * 116, 160 + R() * 60, 5 + R() * 5, 0, 7); x.fill(); } x.fillStyle = '#fff'; x.font = '900 40px Arial'; x.textAlign = 'center'; x.fillText(label, 128, 60); const m = plain(0xffffff, { roughness: .55 }); m.map = tex(c); m.map.repeat.set(1, 1); return m; };
  [[.78, '#7a1d1d', '#3a1410', 'GRANOLA'], [.52, '#f1e3b6', '#d9a440', 'OATS'], [.26, '#f3c11a', '#e8892a', 'CEREAL']].forEach(([z, c1, c2, lb]) => { const side = plain(new THREE.Color(c1).multiplyScalar(.8), { roughness: .6 }); const mats = [pack(c1, c2, lb), side, side, side, side, side]; const m = new THREE.Mesh(new THREE.BoxGeometry(.07, .3, .22), mats); m.position.set(LX + .11, 1.78 + .165, z - .0); put(m); });
  const jar = (grain, z) => { const g = new THREE.Group(); const gl = lathe([[0, 0], [.048, 0], [.052, .01], [.052, .19], [.048, .2], [0, .2]], glass(.2, 0xeef7f4), 28); g.add(gl); const fillM = lathe([[0, .005], [.045, .005], [.049, .012], [.049, .15], [0, .15]], plain(grain, { roughness: .8 }), 28); g.add(fillM); const lid = new THREE.Mesh(new THREE.CylinderGeometry(.052, .052, .022, 24), dark); lid.position.y = .21; g.add(lid); g.position.set(LX + .13, 1.78 + .015, z); return put(g); };
  jar(0x7a3f22, .0); jar(0xe8d9b0, -.18); jar(0x2a2220, -.36);
  [[-.7, .11], [-1.0, .09]].forEach(([z, r]) => { const bowl = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [r * .5, 0], [r * .9, .03], [r, .08], [r * 1.02, .085]].map(p => new THREE.Vector2(p[0], p[1])), 32), (() => { const m = rep(rattan({ base: '#f1f0ea', dark: '#d8d6cc' }), 6, 1); m.side = THREE.DoubleSide; return m; })()); bowl.position.set(LX + .13, 1.78 + .015, z); put(bowl); });

  // ---------- rak buah miring: semua tertata per jenis ----------
  const RX0 = -1.5, RZ0 = -1.55, rack = new THREE.Group(); rack.position.set(RX0, FL, RZ0); put(rack);
  [[-.76, -.27], [.76, -.27], [-.76, .27], [.76, .27]].forEach(([x, z], i) => cy(.018, .018, 1.35, dark, x, .675, z, rack, 12));
  const woodT = rep(WOOD, 1.8, .7);
  const fruitRow = (builder, len, tier, rowZ, n, ax, tilt) => lin(-.6, .6, n).forEach((x, i) => { let o = builder(70 + i * 3 + tier);
    if (len) { o = centered(o, len); o.rotation.x = -Math.PI / 2; o.position.set(x, .012 + (ax || .05), rowZ); } else { o.position.set(x, .012, rowZ); }
    tier.add ? tier.add(o) : 0; });
  [[.88, 'avo'], [.58, 'mango'], [.28, 'orange']].forEach(([y, kind]) => {
    const tier = new THREE.Group(); tier.position.set(0, y, 0); tier.rotation.x = .16; rack.add(tier);
    bx(1.5, .022, .6, woodT, 0, 0, 0, tier, .004); bx(1.5, .07, .02, woodT, 0, .04, .29, tier, .004);
    const row = (builder, len, z, n, up) => lin(-.62, .62, n).forEach((x, i) => { let o = builder(70 + i * 3); if (len) { o = centered(o, len); o.rotation.x = -Math.PI / 2; o.position.set(x, .011 + up, z); } else o.position.set(x, .011, z); put(o, tier); });
    if (kind === 'avo') { row(avocado, .152, -.12, 7, .055); row(avocado, .152, .13, 7, .055); }
    if (kind === 'mango') { row(mango, .14, -.12, 7, .05); row(mango, .14, .13, 7, .05); }
    if (kind === 'orange') { row(orange, 0, -.12, 9, 0); row(apple, 0, .13, 9, 0); }
  });
  bx(1.52, .03, .62, dark, 0, .08, 0, rack, .004);

  // ---------- meja kayu + bangku putih + tisu + nampan camilan ----------
  const TX = -1.95, TZ = .4, tb = new THREE.Group(); tb.position.set(TX, FL, TZ); put(tb);
  bx(.62, .04, .86, rep(WOOD, .8, 1.1), 0, .74, 0, tb, .008); [[-.27, -.38], [.27, -.38], [-.27, .38], [.27, .38]].forEach(([x, z]) => bx(.035, .72, .035, white, x, .36, z, tb, .004)); bx(.5, .02, .74, white, 0, .55, 0, tb);
  bx(.2, .09, .12, white, -.1, .805, -.22, tb, .014); bx(.2, .016, .12, rep(WOOD, .3, .3), -.1, .857, -.22, tb, .004); bx(.15, .002, .08, white, -.1, .868, -.22, tb);
  { const tr = bx(.26, .045, .34, rep(RATTAN, 3, 4), .12, .785, .16, tb, .01); [0xd94a3a, 0xe8c15a, 0x6d8f3c, 0xc0602a, 0x8c3b1e].forEach((c, i) => lin(-.08, .08, 2).forEach((x, j) => { const p = bx(.075, .1, .02, plain(c, { roughness: .35 }), .12 + x * 1.1, .86, .06 + i * .055, tb, .004); p.rotation.x = -.35; })); }
  [[-1.2, -.05], [-1.2, .85]].forEach(([x, z]) => { const s = new THREE.Group(); s.position.set(x, FL, TZ + z); cy(.16, .16, .035, white, 0, .5, 0, s, 28); [[-.1, -.1], [.1, -.1], [-.1, .1], [.1, .1]].forEach(([a, b]) => cy(.012, .012, .5, white, a, .25, b, s, 8)); const rg = new THREE.Mesh(new THREE.TorusGeometry(.11, .008, 6, 24), white); rg.rotation.x = Math.PI / 2; rg.position.y = .2; s.add(rg); put(s); });

  // ---------- tirai merah, TV menu, tong sampah ----------
  { const gm = new THREE.PlaneGeometry(.6, 1.2, 28, 1), p = gm.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin((p.getX(i) + .3) / .6 * Math.PI * 6) * .028);
    gm.computeVertexNormals(); [-2.55, -1.92].forEach(x => { const m = new THREE.Mesh(gm, fabric('#b3122e')); m.position.set(x, 2.38, BZ + .05); put(m); }); const rod = cy(.01, .01, 1.5, STEEL, -2.24, 3.02, BZ + .05); rod.rotation.z = Math.PI / 2; }
  const tvMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: .8 });
  { const [c, x] = cv(512, 288); const g = x.createLinearGradient(0, 0, 512, 288); g.addColorStop(0, '#2fbf7a'); g.addColorStop(1, '#8be0a5'); x.fillStyle = g; x.fillRect(0, 0, 512, 288); [0xff7a2f, 0xd0287f, 0xf2c230, 0x6cc24a].forEach((c2, i) => { x.fillStyle = '#' + c2.toString(16).padStart(6, '0'); x.beginPath(); x.arc(70 + i * 120, 120, 38, 0, 7); x.fill(); x.fillStyle = 'rgba(255,255,255,.85)'; x.fillRect(34 + i * 120, 180, 76, 10); x.fillRect(44 + i * 120, 202, 56, 8); });
    tvMat.map = tex(c); tvMat.emissiveMap = tvMat.map; bx(.92, .56, .05, dark, 1.7, 2.35, BZ + .05, IN, .01); pl(.86, .5, tvMat, 1.7, 2.35, BZ + .078); }
  { const bn = new THREE.Group(); bn.position.set(2.9, FL, -1.65); cy(.17, .16, .62, rep(STEEL, 1, 1), 0, .31, 0, bn, 28); cy(.18, .18, .03, dark, 0, .64, 0, bn, 28); bx(.08, .02, .06, dark, 0, .02, .2, bn); put(bn); }

  // ---------- AC split + hembusan ----------
  const glowT = (() => { const [c, x] = cv(64, 64); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const ac = new THREE.Group(); ac.position.set(-.2, 2.78, BZ + .12); put(ac);
  bx(.95, .28, .2, plain(0xf4f6f7, { roughness: .3, envI: .8 }), 0, 0, 0, ac, .035); bx(.9, .03, .15, plain(0xe4e7e9), 0, -.13, .02, ac);
  const flapPivot = new THREE.Group(); flapPivot.position.set(0, -.135, .085); ac.add(flapPivot); bx(.84, .012, .09, plain(0xdfe3e5), 0, 0, .04, flapPivot);
  const acLedMat = new THREE.MeshStandardMaterial({ color: 0x38c8ff, emissive: 0x38c8ff, emissiveIntensity: 0 }); const aled = new THREE.Mesh(new THREE.SphereGeometry(.008, 8, 8), acLedMat); aled.position.set(.38, .04, .102); ac.add(aled);
  bx(.12, .035, .004, plain(0x1b2a33, { roughness: .2 }), .3, .035, .102, ac);
  const AF = 130, afS = [], afP = []; { const Rr = rng(31); for (let i = 0; i < AF; i++) { afP.push({ x: (Rr() - .5) * .8, ph: Rr(), sp: .3 + Rr() * .25, sw: Rr() * 6.28, a: .04 + Rr() * .1 }); const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT, color: 0x5fb8ff, transparent: true, opacity: 0, depthWrite: false })); sp.scale.set(.1, .1, 1); IN.add(sp); afS.push(sp); } }
  function acFlow(t, on) { afP.forEach((p, i) => { const s = (t * p.sp + p.ph) % 1, d = 1.35 * s, sp = afS[i]; sp.position.set(ac.position.x + p.x + Math.sin(t * 1.7 + p.sw) * p.a * s * 2, ac.position.y - .16 - .35 * d - Math.sin(s * 3.14) * .04, BZ + .24 + .8 * d); sp.material.opacity = on * Math.sin(Math.PI * s) * .55; sp.scale.setScalar(.08 + .1 * s); }); }

  // ---------- cup resmi (cup-kit), di bar sisi pelanggan ----------
  const tmpStudio = new THREE.Scene(); setupStudio(renderer, tmpStudio); const studioEnv = tmpStudio.environment; renderer.toneMapping = THREE.ACESFilmicToneMapping;
  await loadDecal('tex/logo_kit.png');
  const cupKit = makeCup(FRESHJ); cupKit.g.scale.setScalar(.13);
  cupKit.g.traverse(o => { if (o.isMesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m.isMeshStandardMaterial) { m.envMap = studioEnv; m.envMapIntensity = (m.envMapIntensity || 1) * .6; } }); });
  const cup = new THREE.Group(); cup.add(cupKit.g); IN.add(cup); cup.position.set(-2.78, BT, -.62);
  cup.rotation.y = Math.atan2(1.28, .62);   // logo (+z pada cup-kit) menghadap kamera adegan cup
  { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); const gr = x.createRadialGradient(64, 64, 6, 64, 64, 62); gr.addColorStop(0, 'rgba(0,0,0,.62)'); gr.addColorStop(.55, 'rgba(0,0,0,.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
    const blob = new THREE.Mesh(new THREE.PlaneGeometry(.2, .2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false })); blob.rotation.x = -Math.PI / 2; blob.position.y = .0025; cup.add(blob); }

  function apply(st, t) {
    const { kiosk, gen, blender } = st;
    fridgeLed.emissiveIntensity = kiosk * 1.6;
    const bu = bl.userData; bl.position.x = BLX + blender * .0016 * Math.sin(t * 97); bl.position.z = BLZ + blender * .0012 * Math.sin(t * 83);
    bu.bladeG.rotation.y = t * 70 * blender; bu.vt.offset.x = (t * 2.4 * blender) % 1; blLed.emissiveIntensity = blender * 2.5;
    const acOn = gen * kiosk; acLedMat.emissiveIntensity = acOn * 2.6; flapPivot.rotation.x = acOn * .5; acFlow(t, acOn);
  }
  return { apply, lampMat, tvMat, cup };
}
