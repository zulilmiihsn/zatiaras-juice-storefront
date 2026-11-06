import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

mkdirSync('scratch/pickup-review', { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Users/ASUS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
const results = [];
try {
  const requestedWidths = process.argv[2] ?? process.env.PICKUP_WIDTHS;
  const widths = requestedWidths ? requestedWidths.split(',').map(Number) : [320, 360, 375, 390, 768, 1024, 1280, 1440];
  for (const width of widths) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:5199', { waitUntil: 'networkidle' });
    const section = page.locator('section[aria-labelledby="pickup-title"]');
    await section.scrollIntoViewIfNeeded();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1100);
    if (width === 320 || width === 1440) {
      const client = await page.context().newCDPSession(page);
      await client.send('DOM.enable');
      await client.send('CSS.enable');
      const { root } = await client.send('DOM.getDocument');
      const fonts = [];
      for (const selector of ['#pickup-title span', '.pickup-number', '.pickup-step-copy h3', '.pickup-description', '.pickup-cta span']) {
        const { nodeId } = await client.send('DOM.querySelector', { nodeId: root.nodeId, selector });
        const result = await client.send('CSS.getPlatformFontsForNode', { nodeId });
        assert.ok(result.fonts.length > 0);
        assert.ok(result.fonts.every(font => font.isCustomFont));
        const display = selector.startsWith('#pickup-title');
        assert.ok(result.fonts.every(font => display ? /Zatiaras/i.test(font.familyName) : /Jakarta/i.test(font.familyName)));
        fonts.push({ selector, families: result.fonts.map(font => font.familyName), faces: result.fonts.map(font => font.postScriptName) });
      }
      console.log(`FONTS ${width}px: ${JSON.stringify(fonts)}`);
    }
    assert.equal(await section.locator('ol > li').count(), 3);
    assert.equal(await section.locator('a').getAttribute('href'), '/menu');
    assert.match(await section.innerText(), /Setelah siap, tunjukkan kode pesanan/);
    assert.doesNotMatch(await section.innerText(), /Guest checkout|terverifikasi server|Tanpa antre/);
    const layout = await section.evaluate(node => {
      const box = node.getBoundingClientRect();
      return {
        width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
        visible: [...node.querySelectorAll('li')].every(x => getComputedStyle(x).opacity === '1'),
        clipped: [...node.querySelectorAll('h2,h3,p,a,li')].some(x => {
          const r = x.getBoundingClientRect(); return r.left < box.left || r.right > box.right + 1;
        })
      };
    });
    assert.ok(layout.scrollWidth <= width, `Horizontal overflow at ${width}`);
    assert.equal(layout.visible, true);
    assert.equal(layout.clipped, false);
    assert.deepEqual(errors, []);
    await page.evaluate(() => {
      for (const element of document.querySelectorAll('body *')) {
        if (['fixed', 'sticky'].includes(getComputedStyle(element).position) || element.tagName === 'HEADER') element.style.visibility = 'hidden';
      }
    });
    await section.screenshot({ path: `scratch/pickup-review/${width}.png` });
    await section.locator('a').focus();
    assert.equal(await section.locator('a').evaluate(x => x === document.activeElement), true);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await section.locator('li').first().evaluate(x => getComputedStyle(x).opacity), '1');
    assert.ok(await section.locator('li').first().evaluate(x => parseFloat(getComputedStyle(x).transitionDuration) <= 0.001));
    results.push(layout);
    console.log(`PASS ${width}px: layout, steps, CTA, focus, reduced motion, no page errors`);
    await page.close();
  }
  const page = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  await page.goto('http://127.0.0.1:5199', { waitUntil: 'networkidle' });
  assert.equal(await page.locator('#pickup-title').isVisible(), true);
  assert.equal(await page.locator('.pickup-step').first().evaluate(x => getComputedStyle(x).opacity), '1');
  console.log('PASS no-JavaScript content visible');
  writeFileSync('scratch/pickup-review/results.json', JSON.stringify(results, null, 2));
} finally { await browser.close(); }
