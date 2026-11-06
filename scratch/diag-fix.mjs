import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: 'C:/Users/ASUS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
const W = { 1440: 900, 390: 844 };
try {
	for (const w of [1440, 390]) {
		const page = await browser.newPage({ viewport: { width: w, height: W[w] } });
		await page.goto('http://localhost:5199/', { waitUntil: 'networkidle' });
		const total = await page.evaluate(() => document.documentElement.scrollHeight);
		for (let y = 0; y < total; y += 500) { await page.evaluate((yy) => window.scrollTo(0, yy), y); await page.waitForTimeout(80); }
		await page.waitForTimeout(600);
		const r = await page.evaluate(() => {
			const txt = [];
			const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
			let n; while ((n = walker.nextNode())) {
				if (!n.nodeValue.trim()) continue;
				const el = n.parentElement; if (!el) continue;
				const range = document.createRange(); range.selectNodeContents(n);
				const b = range.getBoundingClientRect(); if (b.width < 1) continue;
				const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') continue;
				txt.push({ l: b.left, r: b.right, t: b.top + scrollY, s: parseFloat(cs.fontSize), text: n.nodeValue.trim().slice(0, 40), cls: String(el.className).slice(0, 40) });
			}
			const far = txt.filter((x) => x.r > innerWidth - 40).sort((a, b) => b.r - a.r).slice(0, 6);
			const near = txt.filter((x) => x.l < 40).sort((a, b) => a.l - b.l).slice(0, 4);
			const small = txt.filter((x) => x.s < 13).slice(0, 8);
			const hair = [...document.querySelectorAll('body *')].filter((el) => { const b = el.getBoundingClientRect(); const cs = getComputedStyle(el); return b.height > 0 && b.height <= 1.5 && b.width > 200 && cs.position !== 'fixed'; }).map((el) => `${el.tagName} ${String(el.className).slice(0, 50)} h${el.getBoundingClientRect().height} bg:${getComputedStyle(el).backgroundColor} bt:${getComputedStyle(el).borderTopWidth}`).slice(0, 6);
			const dashed = [...document.querySelectorAll('body *')].filter((el) => /dashed|dotted/.test(getComputedStyle(el).borderTopStyle + getComputedStyle(el).borderLeftStyle)).map((el) => `${el.tagName} ${String(el.className).slice(0, 60)}`).slice(0, 4);
			const shadows = [...document.querySelectorAll('body *')].filter((el) => { const s = getComputedStyle(el).boxShadow; return s && s !== 'none' && /[1-9]\d*px/.test(s); }).map((el) => `${el.tagName} ${String(el.className).slice(0, 60)} :: ${getComputedStyle(el).boxShadow.slice(0, 60)}`).slice(0, 10);
			return { far, near, small, hair, dashed, shadows, sw: document.documentElement.scrollWidth };
		});
		console.log('== width', w, 'scrollWidth', r.sw);
		console.log('far right:', JSON.stringify(r.far));
		console.log('near left:', JSON.stringify(r.near));
		console.log('small:', JSON.stringify(r.small));
		console.log('hair:', JSON.stringify(r.hair));
		console.log('dashed:', JSON.stringify(r.dashed));
		console.log('shadows:', JSON.stringify(r.shadows));
		await page.close();
	}
} finally { await browser.close(); }
