// render_local.cjs — render "Mati lampu? Ke Zatiaras Juice aja" ke MP4 1080x1920 @30fps (H.264 + AAC) untuk Instagram Reels.
// Pakai: npm i  ->  node render_local.cjs        (tes cepat 30 frame: node render_local.cjs --test)
// Butuh: Node 18+, ffmpeg di PATH. GPU sangat disarankan (dengan GPU: menit; tanpa GPU/software: berjam-jam).
const puppeteer = require('puppeteer');
const http = require('http'), fs = require('fs'), path = require('path'), { spawn, spawnSync } = require('child_process');

// cari ffmpeg: FFMPEG=... -> ffmpeg di PATH -> ffmpeg-static (terpasang otomatis lewat `npm i`)
function findFfmpeg() {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  const t = spawnSync('ffmpeg', ['-version']); if (!t.error && t.status === 0) return 'ffmpeg';
  try { const p = require('ffmpeg-static'); if (p && fs.existsSync(p)) return p; } catch (e) { /* belum terpasang */ }
  return null;
}
const FFMPEG = findFfmpeg();
if (!FFMPEG) {
  console.error('\nffmpeg tidak ditemukan.\n  1) Jalankan:  npm i   (memasang ffmpeg-static otomatis), lalu ulangi, ATAU\n  2) PowerShell:  winget install Gyan.FFmpeg   lalu BUKA TERMINAL BARU, ATAU\n  3) Set path manual:  $env:FFMPEG="C:\\path\\ke\\ffmpeg.exe"\n');
  process.exit(1);
}
const TEST = process.argv.includes('--test');
const W = +(process.env.W || 1080), H = Math.round(W * 16 / 9), FPS = +(process.env.FPS || 30);
const AUDIO = process.env.AUDIO || path.join(__dirname, 'audio', 'final_mix.m4a');          // vo_only.m4a = suara saja tanpa SFX
const OUT = process.env.OUT || path.join(__dirname, TEST ? 'tes_30_frame.mp4' : 'Zatiaras_MatiLampu_Reels_1080x1920.mp4');
const USE_PNG = process.env.PNG !== '0';                                                      // PNG = lossless (terbaik). PNG=0 -> JPEG q97 (lebih cepat)
const ROOT = path.join(__dirname, 'web');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2' };
const srv = http.createServer((q, s) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; const f = path.join(ROOT, u); if (!f.startsWith(ROOT) || !fs.existsSync(f)) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' }); s.end(fs.readFileSync(f)); });

(async () => {
  await new Promise(r => srv.listen(8793, r));
  const args = ['--hide-scrollbars', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'];
  if (process.env.EXTRA_ARGS) args.push(...process.env.EXTRA_ARGS.split(' ').filter(Boolean));
  if (process.env.NO_SANDBOX === '1') args.push('--no-sandbox', '--disable-setuid-sandbox');
  if (process.env.SOFTWARE_GL === '1') args.push('--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader');   // hanya kalau tidak ada GPU
  const browser = await puppeteer.launch({ headless: process.env.HEADFUL === '1' ? false : (process.env.HEADLESS || 'new'), executablePath: process.env.CHROME_PATH || undefined, args, defaultViewport: { width: W, height: H, deviceScaleFactor: 1 } });
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('PAGEERR', e.message));
  await page.goto('http://localhost:8793/?render=1', { waitUntil: 'domcontentloaded', timeout: 0 });
  await page.addStyleTag({ content: `body{padding:0!important;margin:0}.shell{display:block!important;min-height:0!important}.stage{width:${W}px!important;height:${H}px!important;border-radius:0!important;max-width:none!important}` });
  await page.waitForFunction(() => window.__ready === true, { timeout: 180000 });
  await page.evaluate(() => document.fonts.ready); await page.evaluate(() => { dispatchEvent(new Event('resize')); return 1; });
  const DUR = await page.evaluate(() => window.__DUR); const N = TEST ? 30 : Math.ceil(DUR * FPS);
  console.log(`Render ${W}x${H} @${FPS}fps, ${N} frame (${(N / FPS).toFixed(1)} dtk) -> ${OUT}`);

  const ff = spawn(FFMPEG, ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-', '-i', AUDIO,
    '-vf', 'scale=in_range=full:out_range=tv:out_color_matrix=bt709,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-profile:v', 'high', '-level', '4.2', '-r', String(FPS), '-g', String(FPS * 2), '-bf', '2', '-maxrate', '35M', '-bufsize', '70M',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-shortest', '-movflags', '+faststart', OUT], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => { ff.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg exit ' + c))); ff.on('error', rej); });

  const t0 = Date.now();
  for (let f = 0; f < N; f++) {
    await page.evaluate(t => { window.seek(t); return 1; }, f / FPS);
    const buf = await page.screenshot(USE_PNG ? { type: 'png' } : { type: 'jpeg', quality: 97 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 30 === 0) { const el = (Date.now() - t0) / 1000; console.log(`frame ${f}/${N}  ${(el / (f + 1)).toFixed(2)} dtk/frame  sisa ~${Math.round(el / (f + 1) * (N - f) / 60)} menit`); }
  }
  ff.stdin.end(); await done; await browser.close(); srv.close();
  console.log('Selesai:', OUT);
})().catch(e => { console.error('ERR', e); process.exit(1); });
