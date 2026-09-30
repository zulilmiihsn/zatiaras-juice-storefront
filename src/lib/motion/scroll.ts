import { browser } from '$app/environment';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (browser) {
	gsap.registerPlugin(ScrollTrigger);
}

/**
 * Checks if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
	if (!browser) return false;
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Svelte action: Staggered reveal of child elements when scrolled into view
 */
export function scrollStagger(
	node: Element,
	options: {
		childSelector?: string;
		y?: number;
		duration?: number;
		stagger?: number;
		start?: string;
	} = {}
) {
	if (!browser || prefersReducedMotion()) return;

	const {
		childSelector = ':scope > *',
		y = 35,
		duration = 0.8,
		stagger = 0.12,
		start = 'top 85%'
	} = options;

	const elements = node.querySelectorAll(childSelector);
	if (elements.length === 0) return;

	gsap.set(elements, { opacity: 0, y });

	const anim = gsap.to(elements, {
		opacity: 1,
		y: 0,
		duration,
		stagger,
		ease: 'power3.out',
		scrollTrigger: {
			trigger: node,
			start,
			toggleActions: 'play none none none',
			once: true
		}
	});

	return {
		destroy() {
			anim.scrollTrigger?.kill();
			anim.kill();
		}
	};
}

/**
 * Svelte action: Subtle parallax scrub on element based on scroll position
 */
export function scrollParallax(
	node: Element,
	options: {
		speed?: number; // e.g. -50 to move up faster, +50 to move down
		rotate?: number;
		scale?: number;
		start?: string;
		end?: string;
	} = {}
) {
	if (!browser || prefersReducedMotion()) return;

	const { speed = -40, rotate = 0, scale = 1, start = 'top bottom', end = 'bottom top' } = options;

	const anim = gsap.to(node, {
		y: speed,
		rotation: rotate,
		scale,
		ease: 'none',
		scrollTrigger: {
			trigger: node,
			start,
			end,
			scrub: 1
		}
	});

	return {
		destroy() {
			anim.scrollTrigger?.kill();
			anim.kill();
		}
	};
}

/**
 * Svelte action: Scroll progress indicator bar (0% -> 100% width)
 */
export function scrollProgress(node: Element) {
	if (!browser) return;

	gsap.set(node, { scaleX: 0, transformOrigin: 'left center' });

	const anim = gsap.to(node, {
		scaleX: 1,
		ease: 'none',
		scrollTrigger: {
			start: 'top top',
			end: 'bottom bottom',
			scrub: 0.15
		}
	});

	return {
		destroy() {
			anim.scrollTrigger?.kill();
			anim.kill();
		}
	};
}
