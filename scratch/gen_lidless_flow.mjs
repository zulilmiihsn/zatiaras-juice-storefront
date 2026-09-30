import fs from 'fs';

const CUP_D = 'M824.986,190.922c7.167,14.8,6.54,28.866-4.215,41.737a38.646,38.646,0,0,1-18.088,12.1c-2.891.926-4.031,2.317-4.424,5.376A511.5,511.5,0,0,1,768.118,369.89c-16.437,42.515-38.762,81.71-65.109,118.654-24.86,34.861-52.659,67.3-80.613,99.616-12.63,14.6-25.944,28.784-34.933,46.2-6.084,11.785-9.79,24.162-6.983,37.67,3.151,15.166,13.138,24.633,28.453,26.711a118.584,118.584,0,0,0,15.444.981c26.271.1,52.557.61,78.808-.116,20.049-.554,36.63,11.605,41.009,33.782,2.12,10.737.627,21.387-.96,31.983-5.6,37.4-12.166,74.628-22.48,111.045a307.42,307.42,0,0,1-10.544,29.829c-10.108,25.371-28.789,41.135-54.4,49.353-23.939,7.682-48.624,10.579-73.452,10.921q-68.875.95-137.774-.22c-23.373-.374-46.731-2.689-69.564-8.411-11.028-2.763-21.684-6.438-31.632-12.261-14.576-8.531-24.415-20.8-30.2-36.61-7.55-20.626-12.23-42.015-15.432-63.663-4.387-29.658-8.607-59.373-11.642-89.194-3.8-37.355,5.353-72.168,23.167-104.881,15.2-27.9,34.7-52.606,56.208-75.615,31.13-33.3,62.976-65.928,94.527-98.831.863-.9,1.852-1.677,2.782-2.511l.944.674c-1.394,2.211-2.722,4.468-4.192,6.626-25.141,36.887-50.553,73.588-75.364,110.7-16.227,24.273-30.855,49.515-40.272,77.471-4.741,14.073-7.944,28.5-7.815,43.347.309,35.7,15,63.61,45.431,82.561,19.655,12.24,41.373,18.46,63.9,22.187a327.28,327.28,0,0,0,63,4.35c40.589-1.179,80.256-7.332,117.567-24.551,15.852-7.316,30.969-15.937,43.278-28.72,1.5-1.557,2.065-4.031,3.064-6.08-2.2-.7-4.4-2.029-6.586-1.988-14.611.276-29.225,1.432-43.821,1.193-28.4-.466-56.773-1.94-84.437-9.356-13.221-3.545-26.012-8.256-37.493-15.991-23.509-15.837-32.288-38.255-28.5-66.055,2.464-18.092,9.839-34.417,18.541-50.194,12.834-23.264,28.972-44.139,45.645-64.658,24.915-30.662,51.459-60.067,71.993-94.148,9.392-15.59,16.944-31.922,19.633-50.195,5.282-35.89-10.782-62.351-38.686-78.6-17.217-10.026-36.206-14.669-55.673-16.622-18.521-1.857-37.187-2.664-55.807-3.015-32.282-.609-64.578-.58-96.868-.684-23.095-.074-46.2.421-69.284.032-30.827-.519-52.843-18.747-60.207-49.134-1.192-4.918-2.169-9.9-3.009-14.89-.5-2.954-1.686-4.338-4.845-4.932a46.434,46.434,0,0,1-22.68-10.833c-18.555-16.425-13.843-47.807,9.1-57.144a58.6,58.6,0,0,1,21.339-3.9c56.7-.3,113.409-.136,170.114-.142q134.152-.014,268.305-.059c32.012-.008,64.024.1,96.035-.089,13.159-.076,24.955,3.086,34.66,12.484Z';

function arcToBezier(ox, oy, rx, ry, rotateX, largeArcFlag, sweepFlag, x, y) {
  const th = rotateX * (Math.PI / 180);
  const sinTh = Math.sin(th);
  const cosTh = Math.cos(th);
  rx = Math.abs(rx);
  ry = Math.abs(ry);
  const px = cosTh * (ox - x) * 0.5 + sinTh * (oy - y) * 0.5;
  const py = -sinTh * (ox - x) * 0.5 + cosTh * (oy - y) * 0.5;
  let pl = (px * px) / (rx * rx) + (py * py) / (ry * ry);
  if (pl > 1) {
    pl = Math.sqrt(pl);
    rx *= pl;
    ry *= pl;
  }
  const a00 = cosTh / rx;
  const a01 = sinTh / rx;
  const a10 = -sinTh / ry;
  const a11 = cosTh / ry;
  const x0 = a00 * ox + a01 * oy;
  const y0 = a10 * ox + a11 * oy;
  const x1 = a00 * x + a01 * y;
  const y1 = a10 * x + a11 * y;
  const d = (x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0);
  let sfactor_sq = 1 / d - 0.25;
  if (sfactor_sq < 0) sfactor_sq = 0;
  let sfactor = Math.sqrt(sfactor_sq);
  if (sweepFlag === largeArcFlag) sfactor = -sfactor;
  const xc = 0.5 * (x0 + x1) - sfactor * (y1 - y0);
  const yc = 0.5 * (y0 + y1) + sfactor * (x1 - x0);
  const th0 = Math.atan2(y0 - yc, x0 - xc);
  const th1 = Math.atan2(y1 - yc, x1 - xc);
  let thArc = th1 - th0;
  if (thArc < 0 && sweepFlag) thArc += 2 * Math.PI;
  else if (thArc > 0 && !sweepFlag) thArc -= 2 * Math.PI;

  const segments = Math.ceil(Math.abs(thArc / (Math.PI * 0.5 + 0.001)));
  const result = [];
  for (let i = 0; i < segments; i++) {
    const startTh = th0 + (i * thArc) / segments;
    const endTh = th0 + ((i + 1) * thArc) / segments;
    const deltaTh = endTh - startTh;
    const alpha = (Math.sin(deltaTh) * (Math.sqrt(4 + 3 * Math.pow(Math.tan(deltaTh / 2), 2)) - 1)) / 3;

    const cosStart = Math.cos(startTh), sinStart = Math.sin(startTh);
    const cosEnd = Math.cos(endTh), sinEnd = Math.sin(endTh);

    const p1x = xc + cosStart - alpha * sinStart;
    const p1y = yc + sinStart + alpha * cosStart;
    const p2x = xc + cosEnd + alpha * sinEnd;
    const p2y = yc + sinEnd - alpha * cosEnd;
    const p3x = xc + cosEnd;
    const p3y = yc + sinEnd;

    const b00 = cosTh * rx, b01 = -sinTh * ry;
    const b10 = sinTh * rx, b11 = cosTh * ry;

    result.push({
      cp1x: b00 * p1x + b01 * p1y,
      cp1y: b10 * p1x + b11 * p1y,
      cp2x: b00 * p2x + b01 * p2y,
      cp2y: b10 * p2x + b11 * p2y,
      x: b00 * p3x + b01 * p3y,
      y: b10 * p3x + b11 * p3y
    });
  }
  return result;
}

function parsePath(d) {
  const cmdRegex = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g;
  let match;
  const segments = [];
  while ((match = cmdRegex.exec(d)) !== null) {
    const type = match[1];
    const nums = match[2].match(/-?[0-9]*\.?[0-9]+(?:e[-+]?[0-9]+)?/gi)?.map(Number) || [];
    segments.push({ type, nums });
  }
  return segments;
}

const DX = -208.807;
const DY = -171.483;

let curX = 0, curY = 0;
const rawCurves = [];

for (const seg of parsePath(CUP_D)) {
  const { type, nums } = seg;
  if (type === 'M') {
    curX = nums[0];
    curY = nums[1];
    rawCurves.push({ type: 'M', x: curX + DX, y: curY + DY });
  } else if (type === 'c') {
    for (let i = 0; i < nums.length; i += 6) {
      const cp1x = curX + nums[i] + DX;
      const cp1y = curY + nums[i+1] + DY;
      const cp2x = curX + nums[i+2] + DX;
      const cp2y = curY + nums[i+3] + DY;
      const endX = curX + nums[i+4] + DX;
      const endY = curY + nums[i+5] + DY;
      rawCurves.push({ type: 'C', cp1x, cp1y, cp2x, cp2y, x: endX, y: endY });
      curX += nums[i+4];
      curY += nums[i+5];
    }
  } else if (type === 'a' || type === 'A') {
    const isRel = type === 'a';
    for (let i = 0; i < nums.length; i += 7) {
      const rx = nums[i], ry = nums[i+1], rot = nums[i+2], laf = nums[i+3], sf = nums[i+4];
      const endX = (isRel ? curX + nums[i+5] : nums[i+5]);
      const endY = (isRel ? curY + nums[i+6] : nums[i+6]);
      const bezs = arcToBezier(curX, curY, rx, ry, rot, laf, sf, endX, endY);
      for (const b of bezs) {
        rawCurves.push({
          type: 'C',
          cp1x: b.cp1x + DX,
          cp1y: b.cp1y + DY,
          cp2x: b.cp2x + DX,
          cp2y: b.cp2y + DY,
          x: b.x + DX,
          y: b.y + DY
        });
      }
      curX = endX;
      curY = endY;
    }
  } else if (type === 'q') {
    for (let i = 0; i < nums.length; i += 4) {
      const qx = curX + nums[i];
      const qy = curY + nums[i+1];
      const endX = curX + nums[i+2];
      const endY = curY + nums[i+3];
      const cp1x = curX + (2/3) * (qx - curX) + DX;
      const cp1y = curY + (2/3) * (qy - curY) + DY;
      const cp2x = endX + (2/3) * (qx - endX) + DX;
      const cp2y = endY + (2/3) * (qy - endY) + DY;
      rawCurves.push({ type: 'C', cp1x, cp1y, cp2x, cp2y, x: endX + DX, y: endY + DY });
      curX = endX;
      curY = endY;
    }
  } else if (type === 'l') {
    for (let i = 0; i < nums.length; i += 2) {
      const endX = curX + nums[i] + DX;
      const endY = curY + nums[i+1] + DY;
      rawCurves.push({ type: 'L', x: endX, y: endY });
      curX += nums[i];
      curY += nums[i+1];
    }
  } else if (type === 'Z' || type === 'z') {
    rawCurves.push({ type: 'Z' });
  }
}

// In rawCurves:
// Segments 4 to 27: Outer right cascade down to bottom basin (ends at (254.0, 302.8))
// Segments 28 to 54: Bottom basin to inner left cascade up (ends at (39.0, 77.1))
// Segments 55 to 63, 0 to 3: The cup lid!
// So if we omit segments 55-63 and 0-3, we have the pure water flow and base!

function r(n) {
  return Math.round(n * 100) / 100;
}

// Build lidless path with waterflow starting at topY (e.g. -120) behind navbar
function buildLidlessPath({ topY = -120, baseScale = 0.44, targetBottom = 1075, topStyle = 'straight' }) {
  const Y_TOP = 78.65;
  const Y_BOT = 640;
  const computedExtra = targetBottom - Y_BOT - (155 * baseScale);

  function mapY(y) {
    if (y >= Y_BOT) {
      return (Y_BOT + computedExtra) + (y - Y_BOT) * baseScale;
    }
    const t = Math.max(0, Math.min(1, (y - Y_TOP) / (Y_BOT - Y_TOP)));
    const ease = 0.5 * (1 - Math.cos(Math.PI * t));
    return y + computedExtra * ease;
  }

  // Right wall start at (589.45, Y_TOP -> mapped to Y_TOP)
  // Left wall end at (38.97, Y_TOP -> mapped to Y_TOP)
  let d = '';

  if (topStyle === 'straight') {
    // Top starts behind navbar at topY:
    // M 589.45, topY -> L 589.45, Y_TOP
    d = `M589.45,${r(topY)}L589.45,${r(Y_TOP)}`;
  } else if (topStyle === 'tapered') {
    // Smooth taper from a focused stream behind navbar into the cup width:
    // e.g. stream center at 450, width 140 (x in [380, 520])
    // Right wall starts at (520, topY), curves out to (589.45, Y_TOP)
    d = `M520,${r(topY)}C550,${r(topY + 60)},585,0,589.45,${r(Y_TOP)}`;
  } else if (topStyle === 'flow_crest') {
    // Curved flow crest
    d = `M589.45,${r(topY)}C589.45,-20,589.45,20,589.45,${r(Y_TOP)}`;
  }

  // Now append segments 4 through 54 (outer right cascade -> bottom basin -> inner left cascade)
  for (let i = 4; i <= 54; i++) {
    const c = rawCurves[i];
    if (c.type === 'C') {
      d += `C${r(c.cp1x)},${r(mapY(c.cp1y))},${r(c.cp2x)},${r(mapY(c.cp2y))},${r(c.x)},${r(mapY(c.y))}`;
    } else if (c.type === 'L') {
      d += `L${r(c.x)},${r(mapY(c.y))}`;
    }
  }

  // Now we are at (38.97, Y_TOP)
  if (topStyle === 'straight') {
    // Go straight up behind navbar to topY, then close across the top to start point
    d += `L38.97,${r(topY)}Z`;
  } else if (topStyle === 'tapered') {
    // Curve up to (380, topY) behind navbar
    d += `C50,0,320,${r(topY + 60)},380,${r(topY)}Z`;
  } else if (topStyle === 'flow_crest') {
    d += `L38.97,${r(topY)}Z`;
  }

  return d;
}

const pathStraight = buildLidlessPath({ topY: -120, topStyle: 'straight' });
const pathTapered = buildLidlessPath({ topY: -120, topStyle: 'tapered' });

const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { background: #191119; color: white; font-family: sans-serif; padding: 20px; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
  .card { background: #261926; border-radius: 12px; padding: 15px; border: 1px solid #442044; }
  h3 { font-size: 14px; margin-top: 0; color: #FFAAD4; }
  p { font-size: 11px; color: #ccc; }
  svg { width: 100%; height: 550px; background: #1f141f; border-radius: 8px; }
  .nav-sim { stroke: #38bdf8; stroke-dasharray: 4; stroke-width: 2; }
</style>
</head>
<body>
  <h2>Lid-less Navbar Waterflow (Tanpa Cup Lid, Mulai Dari Balik Navbar)</h2>
  <div class="grid">
    <div class="card">
      <h3>1. Previous: With Thin Lid</h3>
      <p>Masih ada tutup lid di atas.<br>Dasar bawah tipis.</p>
      <svg viewBox="-40 -140 700 1250">
        <line x1="-40" y1="0" x2="700" y2="0" class="nav-sim" />
        <text x="0" y="-10" fill="#38bdf8" font-size="16">Navbar Bottom (y=0)</text>
        <path d="${buildLidlessPath({ topY: 50, topStyle: 'straight' })}" fill="#555" />
      </svg>
    </div>
    <div class="card">
      <h3>2. Lid-less Flow (Straight Stream from y=-120)</h3>
      <p style="color:#a3e635">Tanpa lid sama sekali.<br>Aliran penuh lurus muncul dari balik navbar.<br>Dasar bawah tipis tembus batas.</p>
      <svg viewBox="-40 -140 700 1250">
        <line x1="-40" y1="0" x2="700" y2="0" class="nav-sim" />
        <text x="0" y="-10" fill="#38bdf8" font-size="16">Navbar Bottom (y=0)</text>
        <path d="${pathStraight}" fill="#FF1081" />
      </svg>
    </div>
    <div class="card">
      <h3>3. Lid-less Flow (Tapered Cascade from y=-120)</h3>
      <p style="color:#f472b6">Tanpa lid sama sekali.<br>Pancaran air mengucur elegan dari balik navbar lalu meluas membentuk Z.<br>Dasar bawah tipis tembus batas.</p>
      <svg viewBox="-40 -140 700 1250">
        <line x1="-40" y1="0" x2="700" y2="0" class="nav-sim" />
        <text x="0" y="-10" fill="#38bdf8" font-size="16">Navbar Bottom (y=0)</text>
        <path d="${pathTapered}" fill="#FF1081" />
      </svg>
    </div>
  </div>
</body>
</html>`;

fs.writeFileSync('scratch/lidless_preview.html', html);
console.log('Saved scratch/lidless_preview.html');

fs.writeFileSync('scratch/lidless_paths.json', JSON.stringify({ pathStraight, pathTapered }, null, 2));
