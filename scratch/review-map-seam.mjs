import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
const phase = process.argv[2] ?? 'after';
const browser = await chromium.launch({executablePath:'C:/Users/ASUS/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe',args:['--enable-unsafe-swiftshader']});
const report=[];
try {
 for(const [width,height] of [[1440,900],[390,844]]) {
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('z-last-outlet','kutilang'));
  await page.goto('http://127.0.0.1:5199',{waitUntil:'networkidle',timeout:60000});
  await page.waitForFunction(()=>document.querySelector('#finder-outlet')?.value==='kutilang');
  await page.locator('#temukan-zatiaras').evaluate((node,mid)=>window.scrollTo({top:scrollY+node.getBoundingClientRect().bottom-mid,behavior:'instant'}),Math.round(height/2));
  await page.locator('[data-map-state="ready"]').waitFor({timeout:35000});
  await page.waitForTimeout(1700);
  await page.evaluate(()=>document.querySelectorAll('video').forEach(v=>v.pause()));
  const styles=await page.locator('#temukan-zatiaras').evaluate(node=>({
   bottom:node.getBoundingClientRect().bottom,
   rootBackground:getComputedStyle(node).backgroundColor,
   mapBackground:getComputedStyle(node.querySelector('.outlet-map')).backgroundColor,
   canvasMask:getComputedStyle(node.querySelector('.maplibregl-canvas')).maskImage,
   washMask:getComputedStyle(node.querySelector('.map-wash')).maskImage,
   creditMask:getComputedStyle(node.querySelector('.maplibregl-ctrl-attrib')).maskImage,
   creditOpacity:getComputedStyle(node.querySelector('.maplibregl-ctrl-attrib')).opacity,
   creditButtonBottom:node.querySelector('.maplibregl-ctrl-attrib-button').getBoundingClientRect().bottom,
   overflow:document.documentElement.scrollWidth>innerWidth
  }));
  if(phase==='after') {
   assert.equal(styles.rootBackground,'rgba(0, 0, 0, 0)');
   assert.equal(styles.mapBackground,'rgba(0, 0, 0, 0)');
   assert.notEqual(styles.canvasMask,'none');assert.equal(styles.washMask,styles.canvasMask);
   assert.equal(styles.creditMask,'none');assert.equal(styles.creditOpacity,'1');assert.equal(styles.overflow,false);
   assert.ok(styles.creditButtonBottom <= styles.bottom, 'Credit button must fit inside map');
   const credits=page.locator('.maplibregl-ctrl-attrib');
   if(!await credits.evaluate(el=>el.classList.contains('maplibregl-compact-show'))) await page.locator('.maplibregl-ctrl-attrib-button').click();
   assert.equal(await credits.getByRole('link',{name:'OpenStreetMap',exact:true}).isVisible(),true);
   await page.locator('.maplibregl-ctrl-attrib-button').click();
  }
  await page.screenshot({path:`scratch/outlet-review/map-seam-${phase}-${width}.png`});
  assert.deepEqual(errors,[]);report.push({width,height,...styles});
  await page.close();
 }
 writeFileSync(`scratch/outlet-review/map-seam-${phase}.json`,JSON.stringify(report,null,2));
 console.log(JSON.stringify(report));
}finally{await browser.close();}
