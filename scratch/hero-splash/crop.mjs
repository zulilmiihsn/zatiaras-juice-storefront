// Crop and enlarge a region of a screenshot: crop.mjs <src> <out> x y w h scale
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const [src, out, x, y, w, h, k] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: 'C:/Users/ASUS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
const p = await b.newPage({ viewport: { width: w * k, height: h * k } });
await p.setContent(`<body style="margin:0;overflow:hidden"><img src="data:image/png;base64,${fs.readFileSync(src).toString('base64')}" style="image-rendering:pixelated;transform-origin:0 0;transform:scale(${k}) translate(-${x}px,-${y}px)"></body>`);
await p.waitForTimeout(300);
await p.screenshot({ path: out });
await b.close();
