import { chromium } from 'playwright-core';
import fs from 'node:fs';
const [src, out] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: 'C:/Users/ASUS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
await p.setContent(`<body style="margin:0;background:#888"><img src="data:image/png;base64,${fs.readFileSync(src).toString('base64')}" style="width:1280px;height:720px;display:block"></body>`);
await p.waitForTimeout(500);
await p.screenshot({ path: out, type: 'jpeg', quality: 80 });
await b.close();
