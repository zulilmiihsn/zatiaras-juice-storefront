import { execFileSync } from 'node:child_process';

// Same approved hero footage, full 60fps and all-keyframe seeking, at desktop 1080p.
// Usage: node scripts/encode-hero-scrub.mjs [path/to/ffmpeg]
execFileSync(
	process.argv[2] ?? 'ffmpeg',
	[
		'-hide_banner',
		'-loglevel',
		'error',
		'-y',
		'-i',
		'static/videos/hero-scrub/desktop.mp4',
		'-an',
		'-vf',
		'scale=1920:1080:flags=lanczos',
		'-c:v',
		'libx264',
		'-preset',
		'slow',
		'-crf',
		'18',
		'-g',
		'1',
		'-pix_fmt',
		'yuv420p',
		'-movflags',
		'+faststart',
		'static/videos/hero-scrub/desktop-1080p.mp4'
	],
	{ stdio: 'inherit' }
);
