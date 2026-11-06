// Minimal MP4 reader for WebCodecs: pulls the H.264 config and every sample's byte range out of
// the first video track. Only what the hero scrub needs: no audio, no fragments, no edit lists.

export type Mp4Track = {
	width: number;
	height: number;
	/** RFC 6381 string, e.g. avc1.640033. */
	codec: string;
	/** AVCDecoderConfigurationRecord (the avcC payload), as VideoDecoder expects it. */
	description: Uint8Array;
	/** Length-prefixed (AVCC) samples in decode order. */
	samples: { offset: number; size: number }[];
};

type Box = { type: string; end: number; body: number };

function* boxes(view: DataView, start: number, end: number): Generator<Box> {
	let pos = start;
	while (pos + 8 <= end) {
		let size = view.getUint32(pos);
		const type = String.fromCharCode(...[4, 5, 6, 7].map((i) => view.getUint8(pos + i)));
		let body = pos + 8;
		if (size === 1) {
			size = Number(view.getBigUint64(pos + 8));
			body = pos + 16;
		} else if (size === 0) {
			size = end - pos;
		}
		if (size < body - pos || pos + size > end) throw new Error(`mp4: bad ${type} box`);
		yield { type, end: pos + size, body };
		pos += size;
	}
}

function find(view: DataView, start: number, end: number, type: string): Box | undefined {
	for (const box of boxes(view, start, end)) if (box.type === type) return box;
}

function need(box: Box | undefined, type: string): Box {
	if (!box) throw new Error(`mp4: no ${type} box`);
	return box;
}

export function parseMp4(buffer: ArrayBuffer): Mp4Track {
	const view = new DataView(buffer);
	const moov = need(find(view, 0, view.byteLength, 'moov'), 'moov');

	for (const trak of boxes(view, moov.body, moov.end)) {
		if (trak.type !== 'trak') continue;
		const mdia = need(find(view, trak.body, trak.end, 'mdia'), 'mdia');
		const hdlr = need(find(view, mdia.body, mdia.end, 'hdlr'), 'hdlr');
		// hdlr: version/flags (4), pre_defined (4), handler_type (4).
		if (view.getUint32(hdlr.body + 8) !== 0x76696465 /* vide */) continue;

		const minf = need(find(view, mdia.body, mdia.end, 'minf'), 'minf');
		const stbl = need(find(view, minf.body, minf.end, 'stbl'), 'stbl');

		// stsd: version/flags (4), entry_count (4), then the first sample entry.
		const stsd = need(find(view, stbl.body, stbl.end, 'stsd'), 'stsd');
		const entryStart = stsd.body + 8;
		const entry = need(
			find(view, entryStart, stsd.end, 'avc1') ?? find(view, entryStart, stsd.end, 'avc3'),
			'avc1'
		);
		// Visual sample entry: 6 reserved + data_ref_index (8), then 16 bytes, width, height, ...
		// and child boxes from byte 78 of the payload.
		const width = view.getUint16(entry.body + 24);
		const height = view.getUint16(entry.body + 26);
		const avcC = need(find(view, entry.body + 78, entry.end, 'avcC'), 'avcC');
		const description = new Uint8Array(buffer.slice(avcC.body, avcC.end));
		const hex = (n: number) => n.toString(16).padStart(2, '0');
		const codec = `avc1.${hex(description[1])}${hex(description[2])}${hex(description[3])}`;

		const stsz = need(find(view, stbl.body, stbl.end, 'stsz'), 'stsz');
		const fixedSize = view.getUint32(stsz.body + 4);
		const count = view.getUint32(stsz.body + 8);
		const sizes = Array.from(
			{ length: count },
			(_, i) => fixedSize || view.getUint32(stsz.body + 12 + i * 4)
		);

		const stsc = need(find(view, stbl.body, stbl.end, 'stsc'), 'stsc');
		const runs = Array.from({ length: view.getUint32(stsc.body + 4) }, (_, i) => ({
			firstChunk: view.getUint32(stsc.body + 8 + i * 12),
			perChunk: view.getUint32(stsc.body + 12 + i * 12)
		}));

		const stco = find(view, stbl.body, stbl.end, 'stco');
		const co64 = stco ? undefined : need(find(view, stbl.body, stbl.end, 'co64'), 'stco');
		const chunkBox = stco ?? co64!;
		const chunkCount = view.getUint32(chunkBox.body + 4);
		const chunkOffset = (i: number) =>
			stco
				? view.getUint32(chunkBox.body + 8 + i * 4)
				: Number(view.getBigUint64(chunkBox.body + 8 + i * 8));

		const samples: Mp4Track['samples'] = [];
		let run = 0;
		for (let chunk = 0; chunk < chunkCount && samples.length < count; chunk++) {
			while (run + 1 < runs.length && runs[run + 1].firstChunk <= chunk + 1) run++;
			let offset = chunkOffset(chunk);
			for (let s = 0; s < runs[run].perChunk && samples.length < count; s++) {
				const size = sizes[samples.length];
				samples.push({ offset, size });
				offset += size;
			}
		}
		if (samples.length !== count) throw new Error('mp4: sample table mismatch');
		return { width, height, codec, description, samples };
	}
	throw new Error('mp4: no video track');
}
