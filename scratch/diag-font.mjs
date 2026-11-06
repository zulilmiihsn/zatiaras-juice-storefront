import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: 'C:/Users/ASUS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
try {
	const page = await browser.newPage({ viewport: { width: 768, height: 1024 } });
	await page.goto('http://localhost:5199/', { waitUntil: 'networkidle' });
	await page.waitForTimeout(1500);
	const cdp = await page.context().newCDPSession(page);
	await cdp.send('DOM.enable');
	await cdp.send('CSS.enable');
	const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
	const { nodeIds } = await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: 'body *' });
	const hits = new Map();
	for (const id of nodeIds) {
		const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId: id }).catch(() => ({ fonts: [] }));
		if (!fonts.some((f) => /Helvetica/i.test(f.familyName))) continue;
		const { outerHTML } = await cdp.send('DOM.getOuterHTML', { nodeId: id });
		const txt = await page.evaluate(() => '');
		const key = outerHTML.slice(0, 160).replace(/\s+/g, ' ');
		hits.set(key, (hits.get(key) || 0) + 1);
	}
	console.log('elements using Helvetica Neue:', hits.size);
	for (const [k, n] of [...hits].slice(0, 15)) console.log(n, k);
	const stacks = await page.evaluate(() => {
		const m = new Map();
		for (const el of document.querySelectorAll('body *')) {
			const ff = getComputedStyle(el).fontFamily;
			if (/Helvetica/.test(ff)) m.set(ff.slice(0, 90), (m.get(ff.slice(0, 90)) || 0) + 1);
		}
		return [...m];
	});
	console.log('stacks containing Helvetica:', JSON.stringify(stacks));
} finally { await browser.close(); }
