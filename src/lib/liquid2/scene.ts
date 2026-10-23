// Liquid 2 scene geometry: a fixed product-shot camera looking down on the floor plane,
// the drink's cylinder proxy placed from screen anchors, and the scroll-to-level mapping.
// Screen coordinates are canvas fractions from the top-left; world y is up, the camera
// looks toward -z. The calm surface sits at y = 0.

export type Vec3 = readonly [number, number, number];

export interface Camera {
	pos: Vec3;
	fwd: Vec3;
	right: Vec3;
	up: Vec3;
	/** Focal length in units of the canvas height. */
	focal: number;
	/** Canvas width / height. */
	aspect: number;
	/** Vertical principal-point offset in canvas heights; positive moves the scene down. */
	shift: number;
}

export interface Drink {
	x: number;
	z: number;
	radius: number;
	height: number;
	baseY: number;
}

/** World extent of the simulation grid on the floor plane. */
export interface Domain {
	x0: number;
	x1: number;
	z0: number;
	z1: number;
}

export interface Tier {
	cols: number;
	rows: number;
}

// Matched to the drink photo's own camera: a long lens, level, eye height at the lid.
// A wide, tilted camera made the pool read as seen from above while the photo is seen
// from the front. The principal point sits high (horizon at ~1/3 of the frame, the lid
// line), and the long lens compresses the pool into a band along the bottom.
const PITCH = 0;
const CAM_POS: Vec3 = [0, 1.0, 7];
const FOCAL = 3.4;
const SHIFT = -0.17;
/** Drink base below the calm surface: it starts partly submerged. */
export const DRINK_BASE_Y = -0.15;
/** Cylinder radius as a fraction of the image's drawn width (cut-outs have side margins). */
export const CUP_FILL = 0.42;
/** How far the grid reaches back from its front edge, in world units. */
const DOMAIN_DEPTH = 6;

const finite = (v: number, fallback: number) => (Number.isFinite(v) ? v : fallback);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export function makeCamera(aspect: number): Camera {
	const a = finite(aspect, 1) > 0 ? finite(aspect, 1) : 1;
	const s = Math.sin(PITCH);
	const c = Math.cos(PITCH);
	return {
		pos: CAM_POS,
		fwd: [0, -s, -c],
		right: [1, 0, 0],
		up: [0, c, -s],
		focal: FOCAL,
		aspect: a,
		shift: SHIFT
	};
}

export function project(cam: Camera, p: Vec3): { x: number; y: number; depth: number } {
	const d: Vec3 = [p[0] - cam.pos[0], p[1] - cam.pos[1], p[2] - cam.pos[2]];
	const depth = dot(d, cam.fwd);
	return {
		x: 0.5 + (cam.focal * dot(d, cam.right)) / depth / cam.aspect,
		y: 0.5 + cam.shift - (cam.focal * dot(d, cam.up)) / depth,
		depth
	};
}

/** World point where the ray through screen (x, y) meets the plane y = planeY, or null. */
export function unprojectToPlane(cam: Camera, x: number, y: number, planeY: number): Vec3 | null {
	const sx = ((x - 0.5) * cam.aspect) / cam.focal;
	const sy = (0.5 + cam.shift - y) / cam.focal;
	const dir: Vec3 = [
		cam.fwd[0] + cam.right[0] * sx + cam.up[0] * sy,
		cam.fwd[1] + cam.right[1] * sx + cam.up[1] * sy,
		cam.fwd[2] + cam.right[2] * sx + cam.up[2] * sy
	];
	if (!(dir[1] < -1e-6)) return null;
	const t = (planeY - cam.pos[1]) / dir[1];
	if (!(t > 0) || !Number.isFinite(t)) return null;
	return [cam.pos[0] + dir[0] * t, planeY, cam.pos[2] + dir[2] * t];
}

/** Cylinder proxy for the drink image: base at the screen anchor, projected height = size. */
export function placeDrink(
	cam: Camera,
	anchorX: number,
	anchorY: number,
	size: number,
	imageAspect: number
): Drink {
	const ax = clamp(finite(anchorX, 0.72), 0, 1);
	const ay = clamp(finite(anchorY, 0.85), 0, 1);
	const target = clamp(finite(size, 0.5), 0.05, 0.95);
	const aspect = finite(imageAspect, 0.8) > 0 ? finite(imageAspect, 0.8) : 0.8;
	const base = unprojectToPlane(cam, ax, ay, DRINK_BASE_Y) ?? [0, DRINK_BASE_Y, 0];
	const baseScreen = project(cam, base).y;
	const projected = (h: number) => baseScreen - project(cam, [base[0], DRINK_BASE_Y + h, base[2]]).y;
	// Projected height grows monotonically with world height while the top stays in front
	// of the camera; bisect.
	let lo = 0.01;
	let hi = 20;
	for (let i = 0; i < 60; i++) {
		const mid = (lo + hi) / 2;
		if (projected(mid) < target) lo = mid;
		else hi = mid;
	}
	const height = (lo + hi) / 2;
	return { x: base[0], z: base[2], radius: height * aspect * CUP_FILL, height, baseY: DRINK_BASE_Y };
}

/** Floor area the camera sees, from just past the bottom screen edge back DOMAIN_DEPTH. */
export function groundDomain(cam: Camera): Domain {
	const near = unprojectToPlane(cam, 0.5, 1, DRINK_BASE_Y);
	const z1 = Math.min(cam.pos[2] - 0.5, (near ? near[2] : 2) + 0.3);
	const z0 = z1 - DOMAIN_DEPTH;
	const farDepth = dot([0, -cam.pos[1], z0 - cam.pos[2]], cam.fwd);
	const half = (farDepth * cam.aspect) / (2 * cam.focal) + 0.3;
	return { x0: -half, x1: half, z0, z1 };
}

/** Mean level at which the surface has climbed past the camera. */
export function coverLevel(cam: Camera): number {
	return cam.pos[1] + 0.25;
}

export function levelForProgress(p: number, cover: number): number {
	if (!Number.isFinite(p)) return 0;
	const t = clamp((p - 0.08) / (0.92 - 0.08), 0, 1);
	return cover * t * t * (3 - 2 * t);
}

export function qualityTier(coarse: boolean): Tier {
	return coarse
		? { cols: 96, rows: 64 }
		: { cols: 160, rows: 112 };
}
