import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';

const html = readFileSync('output/visualizations/zatiaras-map-options.html', 'utf8');
assert.ok(Buffer.byteLength(html) < 1_000_000);
assert.equal(html.includes('\\"'), false);
assert.equal(/__[A-Z_]+__/.test(html), false);
const browser = await chromium.launch({ executablePath: 'C:/Users/ASUS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
try {
  const page = await browser.newPage({ viewport: { width: 800, height: 1100 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('file:///D:/Projects/zatiarasjuice/output/visualizations/zatiaras-map-options-preview.html', { waitUntil: 'load' });
  const frame = page.frameLocator('iframe');
  await frame.locator('#zatiaras-map-options').waitFor();
  await frame.locator('#zatiaras-map-options').evaluate(async () => document.fonts.ready);
  console.log('controls', await frame.locator('button').allTextContents());
  const fonts = await frame.locator('#zatiaras-map-options').evaluate(() => [...document.fonts].map(font => [font.family, font.status]));
  console.log('fonts', fonts);
  assert.ok(fonts.some(([family, status]) => family.includes('ZatiarasConcept') && status === 'loaded'));
  for (const width of [800, 390, 320]) {
    await page.setViewportSize({ width, height: 1200 });
    for (const [index, name] of ['dock','float','rail'].entries()) {
      await frame.locator('section[data-variant]').evaluateAll((nodes, selected) => nodes.forEach((node, i) => { node.hidden = i !== selected; }), index);
      const stage = frame.locator(`[data-layout="${name}"]`);
      await stage.locator('.z-map').evaluate(img => img.decode());
      const bounds = await stage.evaluate(node => {
        const box = node.getBoundingClientRect();
        const visible = [...node.querySelectorAll('select,.z-cta,.z-icon-button,h2,h3')].filter(element => {
          const style = getComputedStyle(element); return style.visibility !== 'hidden' && style.display !== 'none' && element.getClientRects().length;
        });
        return { width: box.width, height: box.height, overflow: document.documentElement.scrollWidth > innerWidth, clipped: visible.some(element => {
          const r = element.getBoundingClientRect(); return r.left < box.left - 1 || r.right > box.right + 1 || r.top < box.top - 1 || r.bottom > box.bottom + 1;
        }) };
      });
      assert.equal(bounds.overflow, false, `${name} ${width} overflow`);
      assert.equal(bounds.clipped, false, `${name} ${width} clipped controls`);
      await stage.screenshot({ path: `output/visualizations/map-options/${name}-${width}.png` });
      await stage.getByRole('combobox', { name: 'Kota', exact: true }).selectOption('berau');
      assert.equal(await stage.locator('[data-name]').innerText(), 'Zatiaras Merah Delima');
      assert.equal(await stage.locator('.z-pin').isVisible(), false);
      await stage.getByRole('combobox', { name: 'Kota', exact: true }).selectOption('balikpapan');
      await stage.getByRole('combobox', { name: 'Outlet', exact: true }).selectOption('gatot-subroto');
      assert.match(await stage.locator('[data-link]').getAttribute('href'), /balikpapan\/gatot-subroto/);
      await stage.getByRole('combobox', { name: 'Kota', exact: true }).selectOption('samarinda');
      if (name === 'rail') {
        await stage.getByRole('button', { name: 'Tutup panel', exact: true }).click();
        assert.equal(await stage.locator('.z-summary').isVisible(), true);
        await stage.getByRole('button', { name: 'Pilih outlet', exact: false }).click();
        assert.equal(await stage.locator('.z-summary').isVisible(), false);
      }
      console.log(`PASS ${name} ${width}px: layout, city/outlet selection, pin truth, fold`);
    }
  }
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
