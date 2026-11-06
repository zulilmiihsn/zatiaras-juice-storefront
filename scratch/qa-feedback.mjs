import { chromium } from 'playwright-core';

const browser = await chromium.launch({
	executablePath: 'C:/Users/ASUS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe'
});
try {
	for (const width of [390, 1440]) {
		const page = await browser.newPage({ viewport: { width, height: 900 } });
		await page.goto('http://127.0.0.1:5197/feedback', { waitUntil: 'networkidle' });
		await page.getByLabel('Ceritakan Pengalamanmu', { exact: false }).fill('Masukan uji');
		await page.getByRole('button', { name: 'Simpan Catatan' }).click();
		await page.getByText('Catatan tersimpan di browser ini', { exact: false }).waitFor();
		const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('z-feedback') || '[]'));
		if (saved.length !== 1 || saved[0].note !== 'Masukan uji') throw new Error('Feedback not saved');
		if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) {
			throw new Error(`Horizontal overflow at ${width}px`);
		}
		await page.screenshot({ path: `scratch/feedback-${width}.png`, fullPage: true });
		console.log(`${width}px: saved and visible`);
		await page.close();
	}
} finally {
	await browser.close();
}
