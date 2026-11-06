import { describe, expect, it, vi } from 'vitest';
import { createHeroExit, exitPose } from './hero-exit';

function piece({ start = 0, baseline = '', line = false } = {}) {
	const animation = { currentTime: 0, pause: vi.fn(), cancel: vi.fn() };
	const el = {
		dataset: line ? { sBase: String(start) } : { s: String(start) },
		style: { transform: baseline },
		animate: vi.fn<(frames: Keyframe[], options: KeyframeAnimationOptions) => typeof animation>(
			() => animation
		)
	};
	return { el, animation };
}

function scope(pieces: ReturnType<typeof piece>[]) {
	return {
		querySelectorAll: () => pieces.map((p) => p.el)
	} as unknown as HTMLElement;
}

describe('hero scroll exit', () => {
	it('preserves the original flight endpoints', () => {
		expect(exitPose(0)).toEqual({ x: 0, y: -0, opacity: 1 });
		const end = exitPose(1);
		expect(end.x).toBeCloseTo(55);
		expect(end.y).toBeCloseTo(-75);
		expect(end.opacity).toBeCloseTo(0.01);
	});

	it('leaves entrance styles alone until the flight starts', () => {
		const p = piece({ start: 0.2, line: true });
		const exit = createHeroExit(scope([p]));
		exit(0);
		exit(0.03);
		exit(0.05);
		expect(p.el.animate).not.toHaveBeenCalled();
		expect(p.el.style.transform).toBe('');
	});

	it('scrubs a paused transform/opacity effect while retaining the font baseline', () => {
		const p = piece({ baseline: 'translateY(0.07em)' });
		const exit = createHeroExit(scope([p]));
		exit(0.1);
		const [frames, options] = p.el.animate.mock.calls[0];
		expect(frames).toHaveLength(61);
		expect(frames[0].transform).toBe('translate(0vw, 0vh) translateY(0.07em)');
		expect(frames.every((frame) => !/rotate|scale/.test(String(frame.transform)))).toBe(true);
		expect(frames.every((frame) => String(frame.transform).endsWith('translateY(0.07em)'))).toBe(
			true
		);
		expect(options).toEqual({ duration: 1000, fill: 'both' });
		expect(p.animation.pause).toHaveBeenCalledOnce();
		expect(p.animation.currentTime).toBeCloseTo(((0.1 - 0.03) * 3.7 * 1000) / 0.55);
		exit(0.1);
		exit(0.2);
		expect(p.el.animate).toHaveBeenCalledOnce();
		expect(p.el.style.transform).toBe('translateY(0.07em)');
	});

	it('retains last-line-first staging and clamps the finished flight', () => {
		const first = piece({ start: 0.2, line: true });
		const last = piece({ start: 0.16, line: true });
		const exit = createHeroExit(scope([first, last]));
		exit(0.03 + 0.18 / 3.7);
		expect(first.el.animate).not.toHaveBeenCalled();
		expect(last.el.animate).toHaveBeenCalledOnce();
		exit(1);
		expect(first.animation.currentTime).toBe(1000);
		expect(last.animation.currentTime).toBe(1000);
	});

	it('releases effects on reverse scroll and cancels them on teardown', () => {
		const p = piece();
		const exit = createHeroExit(scope([p]));
		exit(0.2);
		exit(0);
		expect(p.animation.cancel).toHaveBeenCalledOnce();
		exit(0.2);
		expect(p.el.animate).toHaveBeenCalledTimes(2);
		exit.destroy();
		exit.destroy();
		exit(0.3);
		expect(p.animation.cancel).toHaveBeenCalledTimes(2);
		expect(p.el.animate).toHaveBeenCalledTimes(2);
	});
});
