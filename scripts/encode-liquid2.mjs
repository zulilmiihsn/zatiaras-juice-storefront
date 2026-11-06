// Export only a complete native UHD sequence; publish assets after both videos decode.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
	copyFileSync,
	existsSync,
	mkdirSync,
	readFileSync,
	renameSync,
	statSync,
	writeFileSync
} from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const [manifestPath, ffmpeg] = process.argv.slice(2);
assert.ok(
	manifestPath && ffmpeg,
	'Usage: encode-liquid2.mjs <latest-render.json> <ffmpeg executable>'
);
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
assert.ok(!manifest.setup_only, 'A product-only preview cannot become the splash movie.');
assert.equal(manifest.width, 3840);
assert.equal(manifest.height, 2160);
assert.equal(manifest.color_depth, '16');
const frameCount = manifest.frame_count;
assert.ok(
	Number.isInteger(frameCount) && frameCount >= 2,
	'The render interval must contain at least two frames.'
);
assert.equal(frameCount, manifest.frame_end - manifest.frame_start + 1);
const frames = path.resolve(manifest.directory);
for (let frame = 1; frame <= frameCount; frame++)
	assert.ok(
		existsSync(path.join(frames, `${String(frame).padStart(4, '0')}.png`)),
		`Missing frame ${frame}`
	);
const staging = path.join(frames, 'encoded');
const destination = path.resolve('static/videos/liquid2');
mkdirSync(staging, { recursive: true });
mkdirSync(destination, { recursive: true });
const run = (args) => {
	const result = spawnSync(
		'rtk',
		[ffmpeg, '-hide_banner', '-loglevel', 'error', '-xerror', ...args],
		{
			encoding: 'utf8',
			maxBuffer: 4 * 1024 * 1024,
			windowsHide: true
		}
	);
	if (result.error) throw result.error;
	assert.equal(result.status, 0, result.stderr || result.stdout || 'FFmpeg failed.');
	return result.stdout;
};
const files = [];
for (const [name, width, height] of [
	['rise-uhd.mp4', 3840, 2160],
	['rise-mobile.mp4', 1920, 1080]
]) {
	const output = path.join(staging, name);
	run([
		'-y',
		'-framerate',
		'24',
		'-i',
		path.join(frames, '%04d.png'),
		'-frames:v',
		String(frameCount),
		'-vf',
		`scale=${width}:${height}:flags=lanczos:in_range=full:out_range=tv:out_color_matrix=bt709:sws_dither=ed,format=yuv420p,setparams=range=limited:color_primaries=bt709:color_trc=bt709:colorspace=bt709`,
		'-c:v',
		'libx264',
		'-preset',
		'medium',
		'-crf',
		'18',
		'-g',
		'1',
		'-keyint_min',
		'1',
		'-bf',
		'0',
		'-an',
		'-movflags',
		'+faststart',
		output
	]);
	const decoded = run(['-i', output, '-progress', 'pipe:1', '-nostats', '-f', 'null', '-']);
	assert.equal(
		Number([...decoded.matchAll(/^frame=(\d+)/gm)].at(-1)?.[1]),
		frameCount,
		`${name}: incomplete decode`
	);
	files.push({ name, width, height, frames: frameCount });
}
for (const [name, frame, width, height] of [
	['rise-poster.webp', '0001.png', 3840, 2160],
	['rise-poster-mobile.webp', '0001.png', 1920, 1080],
	['rise-cover.webp', `${String(frameCount).padStart(4, '0')}.png`, 3840, 2160]
]) {
	run([
		'-y',
		'-i',
		path.join(frames, frame),
		'-frames:v',
		'1',
		'-vf',
		`scale=${width}:${height}:flags=lanczos`,
		'-c:v',
		'libwebp',
		'-lossless',
		'1',
		'-compression_level',
		'6',
		path.join(staging, name)
	]);
	files.push({ name, width, height });
}
for (const file of files) {
	const source = path.join(staging, file.name);
	file.bytes = statSync(source).size;
	assert.ok(
		file.bytes > 0 && file.bytes < 25 * 1024 * 1024,
		`${file.name}: Cloudflare asset size limit`
	);
	file.sha256 = createHash('sha256').update(readFileSync(source)).digest('hex');
}
for (const file of files) {
	const temporary = path.join(destination, `${file.name}.partial`);
	copyFileSync(path.join(staging, file.name), temporary);
	renameSync(temporary, path.join(destination, file.name));
}
const report = { render: manifestPath, fps: 24, crf: 18, keyframeInterval: 1, files };
writeFileSync(path.join(staging, 'encode.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
