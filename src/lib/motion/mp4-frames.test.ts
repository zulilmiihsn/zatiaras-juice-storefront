import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseMp4 } from './mp4-frames';

const be32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const box = (type: string, ...parts: number[][]) => {
	const body = parts.flat();
	return [...be32(8 + body.length), ...[...type].map((c) => c.charCodeAt(0)), ...body];
};

/** One video track, two chunks (1 + 2 samples) of sizes 10, 20, 30, data starting at byte 1000. */
function syntheticMp4(): ArrayBuffer {
	const avcC = box('avcC', [1, 0x64, 0x00, 0x33, 0xff, 0xe0]);
	const entry = box(
		'avc1',
		new Array(24).fill(0),
		[0x0f, 0x00, 0x08, 0x70], // 3840x2160
		new Array(50).fill(0),
		avcC
	);
	const stsd = box('stsd', [0, 0, 0, 0], be32(1), entry);
	const stsz = box('stsz', [0, 0, 0, 0], be32(0), be32(3), be32(10), be32(20), be32(30));
	const stsc = box(
		'stsc',
		[0, 0, 0, 0],
		be32(2),
		be32(1),
		be32(1),
		be32(1),
		be32(2),
		be32(2),
		be32(1)
	);
	const stco = box('stco', [0, 0, 0, 0], be32(2), be32(1000), be32(2000));
	const stbl = box('stbl', stsd, stsz, stsc, stco);
	const hdlr = box(
		'hdlr',
		[0, 0, 0, 0],
		[0, 0, 0, 0],
		[...'vide'].map((c) => c.charCodeAt(0))
	);
	const mdia = box('mdia', hdlr, box('minf', stbl));
	return new Uint8Array(box('moov', box('trak', mdia))).buffer;
}

describe('parseMp4', () => {
	it('reads config and sample ranges from a synthetic track', () => {
		const track = parseMp4(syntheticMp4());
		expect(track.width).toBe(3840);
		expect(track.height).toBe(2160);
		expect(track.codec).toBe('avc1.640033');
		expect(track.samples).toEqual([
			{ offset: 1000, size: 10 },
			{ offset: 2000, size: 20 },
			{ offset: 2020, size: 30 }
		]);
	});

	it('rejects a file without a moov box', () => {
		expect(() => parseMp4(new Uint8Array(box('free', [0, 0])).buffer)).toThrow('moov');
	});

	const real = 'static/videos/hero-scrub/desktop.mp4';
	it.skipIf(!existsSync(real))('matches the real hero video', () => {
		const file = readFileSync(real);
		const track = parseMp4(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));
		expect(track.width).toBe(3840);
		expect(track.samples.length).toBe(310);
		const last = track.samples[track.samples.length - 1];
		expect(last.offset + last.size).toBeLessThanOrEqual(file.byteLength);
		// AVCC sample: a run of 4-byte-length-prefixed NALs that exactly fills the sample.
		for (const { offset, size } of [track.samples[0], last]) {
			let pos = 0;
			while (pos < size) pos += 4 + file.readUInt32BE(offset + pos);
			expect(pos).toBe(size);
		}
	});
});
