const fs = require('node:fs');
const path = require('node:path');
const sharp = require('../../../node_modules/.pnpm/sharp@0.35.4_@types+node@24.13.4/node_modules/sharp');

const sourceDirectory = 'C:/Users/ASUS/.codex/generated_images/01a178dc-2735-7f52-a49a-d95033083e7f';
const assets = {
  'leaf-single': 'exec-49e0a9a6-32a4-47a1-8983-9bc014c1b84e.png',
  'leaf-pair': 'exec-75bf4430-28d3-4e3a-a183-151c9a9b8899.png',
  'strawberry-whole': 'exec-6246df0c-4cca-4844-af39-017915bc2be0.png',
  'strawberry-half-leaf': 'exec-f2d9797f-c294-4546-bd6b-de4900477232.png',
};

async function exportAsset(name, source) {
  const { data, info } = await sharp(path.join(sourceDirectory, source))
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const original = Buffer.from(data);
  const { width, height } = info;
  const isFringe = (offset) => original[offset + 1] > 180
    && original[offset] < original[offset + 1] * 0.6
    && original[offset + 2] < original[offset + 1] * 0.4;

  // Remove unnatural key-green residue without altering the deep-green leaf interiors.
  for (let offset = 0; offset < data.length; offset += 4) {
    if (isFringe(offset)) data[offset + 3] = 0;
  }

  // Borrow foreground colors for translucent edge pixels to avoid colored halos.
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4;
      if (!data[offset + 3] || data[offset + 3] >= 235) continue;
      let best = -1;
      let bestDistance = Infinity;
      for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const candidate = (ny * width + nx) * 4;
          const distance = dx * dx + dy * dy;
          if (original[candidate + 3] >= 235 && !isFringe(candidate) && distance < bestDistance) {
            best = candidate;
            bestDistance = distance;
          }
        }
      }
      if (best >= 0) {
        data[offset] = original[best];
        data[offset + 1] = original[best + 1];
        data[offset + 2] = original[best + 2];
      } else if (data[offset + 3] < 24) {
        data[offset + 3] = 0;
      }
    }
  }

  let left = width;
  let top = height;
  let right = 0;
  let bottom = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 0) {
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
      }
    }
  }
  const subject = await sharp(data, { raw: { width, height, channels: 4 } })
    .extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
    .resize({ width: 768, height: 768, fit: 'inside', kernel: 'lanczos3' })
    .png().toBuffer();
  const padded = sharp({
    create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  }).composite([{ input: subject, gravity: 'centre' }]);
  const png = path.join(__dirname, name + '.png');
  await padded.png({ compressionLevel: 9 }).toFile(png);
  await sharp(png).webp({ quality: 90, alphaQuality: 100, effort: 6 }).toFile(path.join(__dirname, name + '.webp'));
}

async function verify(file) {
  const fullPath = path.join(__dirname, file);
  const metadata = await sharp(fullPath).metadata();
  const { data, info } = await sharp(fullPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const points = [[0, 0], [info.width - 1, 0], [0, info.height - 1], [info.width - 1, info.height - 1]];
  const corners = points.map(([x, y]) => data[(y * info.width + x) * 4 + 3]);
  if (!metadata.hasAlpha || corners.some((alpha) => alpha !== 0)) throw new Error('Alpha verification failed: ' + file);
  let partial = 0;
  let visible = 0;
  let borderVisible = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const alpha = data[(y * info.width + x) * 4 + 3];
      if (alpha > 0) visible++;
      if (alpha > 0 && alpha < 255) partial++;
      if ((x === 0 || y === 0 || x === info.width - 1 || y === info.height - 1) && alpha > 0) borderVisible++;
    }
  }
  if (!visible || !partial || borderVisible) throw new Error('Cutout verification failed: ' + file);
  return { file, width: info.width, height: info.height, bytes: fs.statSync(fullPath).size,
    KB: Number((fs.statSync(fullPath).size / 1024).toFixed(1)), alphaCorners: corners,
    partialAlphaPixels: partial, borderVisiblePixels: borderVisible };
}

(async () => {
  for (const [name, source] of Object.entries(assets)) await exportAsset(name, source);
  const rows = [];
  const tiles = [];
  for (const [index, name] of Object.keys(assets).entries()) {
    for (const extension of ['png', 'webp']) rows.push(await verify(name + '.' + extension));
    for (const [row, background] of ['#fffaf7', '#292d2b'].entries()) {
      const tile = await sharp(path.join(__dirname, name + '.webp')).flatten({ background })
        .resize(384, 384).png().toBuffer();
      tiles.push({ input: tile, left: index * 384, top: row * 384 });
    }
  }
  await sharp({ create: { width: 1536, height: 768, channels: 3, background: '#fffaf7' } })
    .composite(tiles).png().toFile(path.join(__dirname, 'preview.png'));
  fs.writeFileSync(path.join(__dirname, 'verification.json'), JSON.stringify(rows, null, 2) + '\n');
  console.log(JSON.stringify(rows, null, 2));
  const inspection = path.join(__dirname, 'edge-inspection.png');
  if (fs.existsSync(inspection)) fs.unlinkSync(inspection);
})().catch((error) => { console.error(error); process.exitCode = 1; });
