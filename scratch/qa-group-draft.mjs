import { chromium } from 'playwright-core';

const browser = await chromium.launch({
	executablePath: 'C:/Users/ASUS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe'
});
try {
	for (const width of [390, 1440]) {
		const page = await browser.newPage({ viewport: { width, height: 900 } });
		await page.goto('http://127.0.0.1:5197/group', { waitUntil: 'networkidle', timeout: 90000 });
		await page.locator('#grp-name').fill('Rina');
		await page.locator('#grp-wa').fill('081234567890');
		await page.locator('#grp-schedule').fill('Besok pukul 14.00');
		await page.getByRole('spinbutton', { name: 'Jumlah Alpukat Kocok dalam cup' }).fill('4');
		await page.getByRole('button', { name: /Simpan Draf Group Order/ }).click();
		await page.waitForURL('**/group/GR-*');
		await page.getByText('Draf tersimpan di browser ini', { exact: false }).waitFor();
		await page.getByText('Alpukat Kocok', { exact: true }).waitFor();
		const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('z-group') || '[]'));
		if (saved.length !== 1 || saved[0].lines[0].qty !== 4) throw new Error('Group draft not saved');
		if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) {
			throw new Error(`Horizontal overflow at ${width}px`);
		}
		await page.screenshot({ path: `scratch/group-draft-${width}.png`, fullPage: true });
		await page.goto('http://127.0.0.1:5197/track', { waitUntil: 'networkidle', timeout: 90000 });
		await page.getByText('Pelacakan langsung dari outlet belum', { exact: false }).waitFor();
		const response = await page.request.post('http://127.0.0.1:5197/api/payment/webhook', {
			data: { providerEventId: 'forged', orderId: 'forged', amount: 1, signatureValid: true }
		});
		if (response.status() !== 503) throw new Error('Webhook accepted unverified payment');
		console.log(`${width}px: draft, tracking notice, and webhook passed`);
		await page.close();
	}
} finally {
	await browser.close();
}
