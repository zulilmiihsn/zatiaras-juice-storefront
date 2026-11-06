// Scroll-scrubbed video without HTMLVideoElement seeks: every sample of the intra-only hero
// video is a keyframe, so any frame decodes on its own. A WebCodecs VideoDecoder decodes the
// frames around the scroll position into a small window and the nearest one is painted on a canvas.
import { parseMp4, type Mp4Track } from './mp4-frames';

type HardwarePreference = NonNullable<VideoDecoderConfig['hardwareAcceleration']>;

/** Decodes in flight at once: a stale target waits for at most this many frames. */
const MAX_IN_FLIGHT = 3;
/** Some decoders hold the last frame back until more input arrives; flush if nothing comes out. */
const STALL_MS = 120;

export class FrameScrubber {
	/** First frame painted: the canvas can be shown over the poster. */
	onFirstFrame?: () => void;
	/** Decoder died: switch back to the <video> path. */
	onError?: () => void;

	private readonly ctx: CanvasRenderingContext2D;
	private readonly decoder: VideoDecoder;
	private readonly cache = new Map<number, VideoFrame>();
	private readonly pending = new Set<number>();
	/** Frames kept either side of the target. 4K frames are ~12 MB each, so keep that window tight. */
	private readonly radius: number;
	private target = 0;
	private direction = 1;
	private drawn = -1;
	private raf = 0;
	private stall = 0;
	private destroyed = false;
	private failed = false;

	private constructor(
		private readonly buffer: ArrayBuffer,
		private readonly track: Mp4Track,
		private readonly canvas: HTMLCanvasElement,
		ctx: CanvasRenderingContext2D,
		hardwareAcceleration: HardwarePreference
	) {
		this.ctx = ctx;
		this.radius = track.width * track.height > 4_000_000 ? 4 : 10;
		this.decoder = new VideoDecoder({
			output: (frame) => this.onFrame(frame),
			error: () => this.fail()
		});
		this.decoder.configure({
			codec: track.codec,
			description: track.description,
			codedWidth: track.width,
			codedHeight: track.height,
			hardwareAcceleration,
			optimizeForLatency: true
		});
	}

	/** Resolves null when WebCodecs, the file, or the decoder config is unusable: use <video> then. */
	static async create(
		url: string,
		canvas: HTMLCanvasElement,
		signal: AbortSignal
	): Promise<FrameScrubber | null> {
		if (typeof VideoDecoder === 'undefined' || typeof EncodedVideoChunk === 'undefined')
			return null;
		try {
			const res = await fetch(url, { signal });
			if (!res.ok) return null;
			const buffer = await res.arrayBuffer();
			const track = parseMp4(buffer);

			let hardwareAcceleration: HardwarePreference | null = null;
			for (const preference of ['prefer-hardware', 'no-preference'] as const) {
				const { supported } = await VideoDecoder.isConfigSupported({
					codec: track.codec,
					description: track.description,
					codedWidth: track.width,
					codedHeight: track.height,
					hardwareAcceleration: preference
				});
				if (supported) {
					hardwareAcceleration = preference;
					break;
				}
			}
			const ctx = canvas.getContext('2d', { alpha: false });
			if (!hardwareAcceleration || !ctx || signal.aborted) return null;

			canvas.width = track.width;
			canvas.height = track.height;
			const scrubber = new FrameScrubber(buffer, track, canvas, ctx, hardwareAcceleration);
			scrubber.pump();
			return scrubber;
		} catch {
			return null;
		}
	}

	/** p in 0..1 across the whole video. */
	seek(p: number) {
		if (this.destroyed || this.failed) return;
		const last = this.track.samples.length - 1;
		const target = Math.min(last, Math.max(0, Math.round(p * last)));
		if (target === this.target) return;
		this.direction = target > this.target ? 1 : -1;
		this.target = target;
		this.evict();
		this.pump();
		this.requestDraw();
	}

	destroy() {
		this.destroyed = true;
		cancelAnimationFrame(this.raf);
		clearTimeout(this.stall);
		if (this.decoder.state !== 'closed') this.decoder.close();
		for (const frame of this.cache.values()) frame.close();
		this.cache.clear();
		this.pending.clear();
	}

	private fail() {
		if (this.destroyed || this.failed) return;
		this.failed = true;
		this.destroy();
		this.onError?.();
	}

	/** Next frame worth decoding: the target first, then outward, preferring the scroll direction. */
	private next(): number {
		const last = this.track.samples.length - 1;
		for (let d = 0; d <= this.radius; d++) {
			for (const i of d === 0
				? [this.target]
				: [this.target + this.direction * d, this.target - this.direction * d]) {
				if (i >= 0 && i <= last && !this.cache.has(i) && !this.pending.has(i)) return i;
			}
		}
		return -1;
	}

	private pump() {
		if (this.destroyed || this.failed) return;
		while (this.pending.size < MAX_IN_FLIGHT) {
			const index = this.next();
			if (index < 0) break;
			const { offset, size } = this.track.samples[index];
			try {
				this.decoder.decode(
					new EncodedVideoChunk({
						type: 'key',
						timestamp: index,
						data: new Uint8Array(this.buffer, offset, size)
					})
				);
			} catch {
				this.fail();
				return;
			}
			this.pending.add(index);
		}
		clearTimeout(this.stall);
		if (this.pending.size) {
			this.stall = window.setTimeout(() => {
				if (!this.destroyed && this.pending.size) this.decoder.flush().catch(() => {});
			}, STALL_MS);
		}
	}

	private onFrame(frame: VideoFrame) {
		const index = frame.timestamp;
		this.pending.delete(index);
		if (this.destroyed || this.cache.has(index) || Math.abs(index - this.target) > this.radius) {
			frame.close();
		} else {
			this.cache.set(index, frame);
		}
		this.evict();
		this.pump();
		this.requestDraw();
	}

	private evict() {
		for (const [index, frame] of this.cache) {
			if (Math.abs(index - this.target) > this.radius) {
				frame.close();
				this.cache.delete(index);
			}
		}
	}

	private requestDraw() {
		if (!this.raf) this.raf = requestAnimationFrame(() => this.draw());
	}

	private draw() {
		this.raf = 0;
		if (this.destroyed) return;
		let best = -1;
		for (const index of this.cache.keys()) {
			if (best < 0 || Math.abs(index - this.target) < Math.abs(best - this.target)) best = index;
		}
		if (best < 0 || best === this.drawn) return;
		this.ctx.drawImage(this.cache.get(best)!, 0, 0, this.canvas.width, this.canvas.height);
		const first = this.drawn < 0;
		this.drawn = best;
		if (first) this.onFirstFrame?.();
	}
}
