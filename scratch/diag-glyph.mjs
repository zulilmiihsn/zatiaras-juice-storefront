import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: 'C:/Users/ASUS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
try {
	const page = await browser.newPage({ viewport: { width: 768, height: 1024 } });
	await page.goto('http://localhost:5199/', { waitUntil: 'networkidle' });
	await page.waitForTimeout(1500);
	const cdp = await page.context().newCDPSession(page);
	await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
	const { root } = await cdp.send('DOM.getDocument', { depth: -1, pierce: true });
	const hits = [];
	const walk = async (node) => {
		if (node.nodeType === 3 && /\S/.test(node.nodeValue)) {
			const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId: node.nodeId }).catch(() => ({ fonts: [] }));
			if (fonts.some((f) => /Helvetica/i.test(f.familyName))) hits.push(node.nodeValue.trim().slice(0, 60) + ' | parent ' + (node.parentNode ? node.parentNode.localName : '?'));
		}
		for (const c of node.children || []) await walk(c);
	};
	const scan = async (node) => {
		if (!node) return;
		await walk(node);
	};
	const { nodeIds } = await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: 'body' });
	for (const id of nodeIds) {
		const { node } = await cdp.send('DOM.describeNode', { nodeId: id, depth: -1, pierce: true });
		await scan(node);
	}
	console.log('text nodes in Helvetica Neue:', hits.length);
	for (const h of hits.slice(0, 20)) console.log(h);
} finally { await browser.close(); }
