// crown.ts — procedural 3D liquid crown, raymarched in one WebGL2 fragment pass.
// Geometry is a signed distance field: a flaring crown wall with a beaded rim, nine
// tapered arms that shed droplets, a puddle it rises from, and a ring wave that grows
// out of that puddle and rolls toward the camera until the camera is submerged.
// No textures: everything is shaded analytically (studio environment, fresnel,
// translucency through thin liquid, ambient occlusion).
// The crown is unwrapped into a continuous wave sheet. Its pool extends past the
// viewport, so scroll immersion has no visible circular edge or detached pedestal.

const VS = `#version 300 es
void main() {
	vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
	gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const FS = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform vec2 uPrincipal;  // screen point (backing px, GL origin) the camera target projects to
uniform float uFocal;     // focal length in units of the backing height
uniform vec3 uCam, uRight, uUp, uFwd;
uniform float uTime, uDropTime;
uniform float uH;         // crown wall height
uniform float uArm;       // arm length multiplier
uniform float uFlare;     // how far the wall opens outward with height
uniform float uLag;       // vertical stretch from scroll inertia
uniform vec2 uLean;       // shear of the crown (x, z) from pointer pushes
uniform float uLevel, uPoolR, uRingR, uRingA, uSlopeK;
uniform vec3 uPtr;        // pointer on the liquid surface: x, z, strength
uniform vec3 uBox;        // bounds: half extent xz, y min, y max
out vec4 outColor;

const float N = 9.0;
const float N2 = 13.0;
const float TAU = 6.2831853;
// Heritage Magenta #ff1081, shown flat once the camera is under the surface.
const vec3 BRAND = vec3(1.0, 0.0627, 0.5059);

float hash(float n) { return fract(sin(n * 127.1 + 31.7) * 43758.5453); }
float smin(float a, float b, float k) {
	float h = max(k - abs(a - b), 0.0) / k;
	return min(a, b) - h * h * k * 0.25;
}
float smax(float a, float b, float k) { return -smin(-a, -b, k); }
float dot2(vec3 v) { return dot(v, v); }

// Inigo Quilez: exact distance to a cone with rounded ends.
float sdRoundCone(vec3 p, vec3 a, vec3 b, float r1, float r2) {
	vec3 ba = b - a;
	float l2 = dot(ba, ba);
	float rr = r1 - r2;
	float a2 = l2 - rr * rr;
	float il2 = 1.0 / l2;
	vec3 pa = p - a;
	float y = dot(pa, ba);
	float z = y - l2;
	float x2 = dot2(pa * l2 - ba * y);
	float y2 = y * y * l2;
	float z2 = z * z * l2;
	float k = sign(rr) * rr * rr * x2;
	if (sign(z) * a2 * z2 > k) return sqrt(x2 + z2) * il2 - r2;
	if (sign(y) * a2 * y2 < k) return sqrt(x2 + y2) * il2 - r1;
	return (sqrt(x2 * a2 * il2) + y * rr) * il2 - r1;
}

float baseH(vec2 p) {
	return -0.78 + 0.32 * sin(p.x * 0.72 - 0.7 + uTime * 0.24)
		+ 0.2 * sin(p.x * 1.23 + p.y * 0.64 - uTime * 0.32)
		+ 0.13 * sin(p.y * 2.2 + p.x * 0.45 - uTime * 0.65);
}

float wallR(float y) { float c = max(y, 0.0); return 0.82 + uFlare * c * c; }

float crown(vec3 p) {
	p.y -= uLevel + baseH(p.xz);
	p.y /= 1.0 + uLag;
	float lift = max(p.y, 0.0);
	p.xz -= uLean * lift * lift;
	p.x -= 0.2 * lift * lift * sin(p.x * 0.65 + 0.9);
	// Unwrap the circular crown: x traverses its rim, z traverses its thickness.
	// The slow lateral warp keeps the crest irregular without noisy surface normals.
	float bend = 0.16 * sin(p.x * 1.2 + uTime * 0.37) + 0.06 * sin(p.x * 2.7 - uTime * 0.51);
	float r = p.z + 0.82 + bend;
	float th = p.x * 0.35 + 0.22 + 0.025 * sin(uTime * 0.55 + p.x * 0.4);
	float y = p.y;
	float H = uH * (0.65 + 0.35 * smoothstep(-3.0, 2.8, p.x));

	// One arm per sector: fold the angle so only the nearest arm is evaluated.
	float sec = TAU / N;
	float k = floor(th / sec + 0.5);
	float a = th - k * sec;
	float id = mod(k, N);
	float h1 = hash(id), h2 = hash(id + 11.3), h3 = hash(id + 27.1), h4 = hash(id + 5.9);

	// Wall: thin flaring sheet, capillary ripples running up it, thicker beaded rim.
	float cu = cos(a * N * 0.5);
	float top = H * (0.48 + 1.15 * h1 * cu * cu * cu * cu);
	// The cusps rise steeply around the rim; scale the cut so rays cannot step through them.
	float cusp = H * h1 * N * abs(cu * cu * cu * sin(a * N * 0.5)) / max(r, 0.3);
	float rip = 0.055 * sin(y * 3.8 - uTime * 0.9 + p.x * 1.9)
		+ 0.022 * sin(y * 7.0 + uTime * 0.6 - p.x * 3.6);
	float tw = 0.085 * (1.0 - 0.55 * clamp(y / H, 0.0, 1.0));
	float slope = 2.0 * uFlare * max(y, 0.0);
	float wall = (abs(r - wallR(y) + rip) - tw) / sqrt(1.0 + slope * slope);
	wall = smax(wall, (y - top) / sqrt(1.0 + cusp * cusp), 0.04);
	wall = max(wall, -0.12 - y);
	float rim = length(vec2(r - wallR(top), y - top)) - tw * 0.82;
	float d = smin(wall, rim, 0.05);

	// Arm: two tapered segments curling outward, a bead at the tip that swells and lets go.
	vec3 q = vec3(r, y, a / 0.35);
	float sway = sin(uTime * 1.3 + id * 1.7) * 0.1 + sin(uTime * 2.7 + id) * 0.04;
	float e = mix(0.9, 1.35, h2) + sway;
	float topA = H * (0.48 + 1.15 * h1);
	vec3 A = vec3(wallR(topA), topA - 0.06, 0.0);
	float L = H * (0.22 + 0.38 * h3) * uArm;
	vec2 dir = vec2(cos(e), sin(e));
	vec3 M = A + vec3(dir.x * L * 0.55, dir.y * L * 0.55 - 0.02 * L, 0.0);
	vec3 T = A + vec3(dir.x * L + 0.12 * L, dir.y * L - 0.22 * L, 0.0);
	float period = 2.6 + h4 * 2.0;
	float ph = fract(uDropTime / period + h1 * 7.0);
	float arm = sdRoundCone(q, A, M, 0.13 * H, 0.075 * H);
	arm = smin(arm, sdRoundCone(q, M, T, 0.075 * H, 0.06 * H), 0.08);
	arm = smin(arm, length(q - T) - (0.065 + 0.025 * ph) * H, 0.07);
	d = smin(d, arm, 0.07);

	// The drop that left this tip, on a ballistic arc.
	float age = ph * period;
	vec2 v = normalize((T - M).xy) * 0.9 + vec2(0.15, 0.8);
	vec3 dp = T + vec3(v * age + vec2(0.0, -1.6 * age * age), 0.0);
	vec3 dq = q - dp;
	dq.y /= 1.0 + 0.5 * smoothstep(0.0, 0.6, age);
	d = smin(d, length(dq) - 0.065 * H * (1.0 - 0.35 * ph), 0.03);

	// Finer spray thrown from the rim between the arms.
	float sec2 = TAU / N2;
	float k2 = floor((th + 0.13) / sec2 + 0.5);
	float a2 = th + 0.13 - k2 * sec2;
	float id2 = mod(k2, N2);
	float p2 = 3.5 + 1.5 * hash(id2 + 3.0);
	float ph2 = fract(uDropTime / p2 + hash(id2 + 9.0));
	float age2 = ph2 * p2;
	vec3 q2 = vec3(r, y, a2 / 0.35);
	vec2 v2 = vec2(0.35 + 0.35 * hash(id2 + 1.0), 1.6 + 0.8 * hash(id2 + 2.0)) * uArm;
	vec3 s0 = vec3(wallR(H * 0.9), H * 0.9, 0.0);
	vec3 sp = s0 + vec3(v2 * age2 + vec2(0.0, -1.8 * age2 * age2), 0.0);
	d = smin(d, length(q2 - sp) - 0.034 * H * (1.0 - 0.5 * ph2), 0.02);

	// The lean shear stretches space with height; keep the step conservative.
	float lk = 2.0 * length(uLean) * lift;
	return d * 0.72 * min(1.0, 1.0 + uLag) / sqrt(1.0 + lk * lk);
}

// Puddle surface; the ring wave rises out of it and keeps a raised plateau behind its crest.
float surfaceH(vec2 xz) {
	float r = length(xz);
	float h = uLevel + baseH(xz);
	// The front rolls down into a deep body rather than exposing a flat reflective disk.
	h -= 0.34 * pow(max(0.0, xz.y), 2.0);
	h += 0.035 * sin(r * 3.0 - uTime * 1.4) * exp(-max(r - 1.0, 0.0) * 0.3);
	h += 0.035 * sin(xz.x * 2.1 + uTime * 0.7) * sin(xz.y * 2.7 - uTime * 0.8);
	float x = xz.y - uRingR + 0.28 * sin(xz.x * 0.8 + uTime * 0.25);
	h += uRingA * exp(-x * x / 1.8);
	// Chop on the wave: three octaves so the face never reads as a smooth blob.
	h += uRingA * (0.035 * sin(xz.x * 2.1 + uTime * 0.8) * sin(xz.y * 1.7 - uTime * 0.6) +
		0.018 * sin(xz.x * 4.3 - uTime * 1.1 + xz.y * 3.1) +
		0.006 * sin(xz.x * 8.7 + uTime * 1.5 - xz.y * 7.9));
	vec2 dp = xz - uPtr.xy;
	float dd = length(dp);
	h += uPtr.z * (0.09 * sin(dd * 9.0 - uTime * 6.0) - 0.08) * exp(-dd * 1.8);
	return h;
}

float pool(vec3 p) {
	float r = length(p.xz);
	float top = (p.y - surfaceH(p.xz)) * uSlopeK / sqrt(1.0 + pow(0.68 * max(p.z, 0.0), 2.0));
	// Lens-shaped underside so the lip curls under instead of ending in a wall.
	float side = r - uPoolR + max(0.0, uLevel - p.y) * 0.1;
	return max(max(smax(top, side, 0.28), -p.z - 0.45), uLevel - 14.0 - p.y);
}

// Drops hopping off the crest of the ring wave.
float crestSpray(vec3 p) {
	const float N3 = 40.0;
	float th = p.x * 0.14;
	float r = p.z;
	float sec = TAU / N3;
	float k = floor(th / sec + 0.5);
	float a = th - k * sec;
	float id = mod(k, N3);
	float ph = fract(uTime / (0.8 + 0.5 * hash(id + 4.0)) + hash(id + 8.0));
	float hop = 4.0 * ph * (1.0 - ph) * (0.25 + 0.35 * hash(id + 6.0)) * sqrt(uRingA);
	vec3 c = vec3(uRingR + 0.15 + 0.5 * ph * hash(id + 2.0),
		uLevel + baseH(p.xz) - 0.34 * max(r, 0.0) * max(r, 0.0) + uRingA * 0.95 + hop, 0.0);
	vec3 q = vec3(r, p.y, a / 0.14);
	return length(q - c) - 0.07 * sqrt(uRingA) * (1.0 - 0.6 * ph);
}

float scene(vec3 p) {
	float d = pool(p);
	if (uRingA > 0.2 && uLevel < 2.0) d = smin(d, crestSpray(p), 0.08);
	// Crown is skipped wherever its bounding sphere cannot change the result.
	float bound = length(vec2(p.y - uLevel - 0.6, p.z - 0.7)) - 3.8;
	if (bound < d + 0.12) d = smin(d, crown(p), 0.12);
	return d;
}

vec3 normalAt(vec3 p) {
	const vec2 e = vec2(1.0, -1.0) * 0.0015;
	return normalize(e.xyy * scene(p + e.xyy) + e.yyx * scene(p + e.yyx) +
		e.yxy * scene(p + e.yxy) + e.xxx * scene(p + e.xxx));
}

float occlusion(vec3 p, vec3 n) {
	float o = 0.0, s = 1.0;
	for (int i = 1; i <= 3; i++) {
		float h = 0.04 + 0.08 * float(i);
		o += (h - scene(p + n * h)) * s;
		s *= 0.6;
	}
	return clamp(1.0 - o * 2.2, 0.0, 1.0);
}

const vec3 KEY = vec3(-0.4969, 0.6776, 0.5421);  // normalize(-0.55, 0.75, 0.6)
const vec3 BACK = vec3(0.303, 0.5051, -0.8081);  // normalize(0.3, 0.5, -0.8)

float softbox(vec3 ray, vec3 direction, vec2 extent) {
	float facing = dot(ray, direction);
	if (facing <= 0.0) return 0.0;
	vec3 right = normalize(cross(direction, vec3(0.0, 1.0, 0.0)));
	vec3 up = cross(right, direction);
	vec2 uv = vec2(dot(ray, right), dot(ray, up)) / facing;
	vec2 edge = abs(uv) - extent;
	return 1.0 - smoothstep(-0.025, 0.055, max(edge.x, edge.y));
}

// Photo studio: grey sweep, one large softbox, a strip light and a back rim light.
vec3 env(vec3 d) {
	// Dark sweep so reflections read as crisp highlights, not a milky haze.
	vec3 c = mix(vec3(0.04, 0.005, 0.012), vec3(0.13, 0.07, 0.1), smoothstep(-0.25, 0.8, d.y));
	c = mix(c, vec3(0.25, 0.005, 0.055), (1.0 - smoothstep(-0.5, 0.0, d.y)) * 0.8);
	c += 9.0 * softbox(d, KEY, vec2(0.26, 0.48));
	c += 2.0 * softbox(d, normalize(vec3(0.1, 0.98, 0.1)), vec2(0.55, 0.2));
	// Broad front softbox behind the camera: a wet highlight runs down every arm.
	c += 7.0 * softbox(d, vec3(0.1426, 0.3328, 0.9321), vec2(0.12, 0.48));
	c += 3.5 * softbox(d, vec3(-0.2683, -0.3578, 0.8944), vec2(0.6, 0.06));
	vec2 lxz = normalize(vec2(-0.9, 0.45));
	c += 6.0 * softbox(d, normalize(vec3(lxz.x, 0.2, lxz.y)), vec2(0.045, 0.65));
	vec2 sxz = normalize(vec2(0.85, 0.5));
	c += 5.0 * softbox(d, normalize(vec3(sxz.x, 0.1, sxz.y)), vec2(0.045, 0.6));
	c += 8.0 * softbox(d, BACK, vec2(0.32, 0.22));
	return c;
}

vec2 boxHit(vec3 ro, vec3 rd, vec3 lo, vec3 hi) {
	vec3 inv = 1.0 / (rd + vec3(1e-6));
	vec3 t0 = (lo - ro) * inv, t1 = (hi - ro) * inv;
	vec3 a = min(t0, t1), b = max(t0, t1);
	return vec2(max(max(a.x, a.y), a.z), min(min(b.x, b.y), b.z));
}

void main() {
	vec3 ro = uCam;
	if (uLevel > 6.6) { outColor = vec4(BRAND, 1.0); return; }
	vec2 uv = (gl_FragCoord.xy - uPrincipal) / uRes.y;
	vec3 rd = normalize(uFwd * uFocal + uRight * uv.x + uUp * uv.y);
	vec2 tb = boxHit(ro, rd, vec3(-uBox.x, uBox.y, -uBox.x), vec3(uBox.x, uBox.z, uBox.x));
	if (tb.x > tb.y || tb.y < 0.0) { outColor = vec4(0.0); return; }

	float t = max(tb.x, 0.0);
	float previousT = t;
	float pix = 1.0 / (uRes.y * uFocal);
	float best = 1e9, tBest = t;
	bool hit = false;
	for (int i = 0; i < STEPS; i++) {
		float d = scene(ro + rd * t);
		float cov = d / (pix * t);
		if (cov < best) { best = cov; tBest = t; }
		if (d < pix * max(t, 0.1) * 0.35) {
			// A distorted distance field can cross a thin sheet. Bracket the root
			// before computing normals, rather than shading a point inside the volume.
			if (d < 0.0) {
				float lo = previousT, hi = t;
				for (int j = 0; j < 7; j++) {
					float mid = (lo + hi) * 0.5;
					if (scene(ro + rd * mid) < 0.0) hi = mid; else lo = mid;
				}
				t = (lo + hi) * 0.5;
			}
			hit = true;
			break;
		}
		previousT = t;
		t += d * 0.9;
		if (t > tb.y) break;
	}
	// Silhouettes get a one-pixel coverage ramp instead of a stair-stepped edge.
	float alpha = hit ? 1.0 : 1.0 - smoothstep(0.0, 0.7, best);
	if (alpha <= 0.0) { outColor = vec4(0.0); return; }
	if (!hit) t = tBest;
	vec3 p = ro + rd * t;
	vec3 n = normalAt(p);
	float occ = occlusion(p, n);

	vec3 albedo = vec3(1.0, 0.0008, 0.145);
	float dif = max(dot(n, KEY), 0.0);
	vec3 col = albedo * (dif * 0.72 + 0.18) * (0.4 + 0.6 * occ);
	// Thin liquid (arms, drops, the crest) lets light through and glows hotter.
	float thin = exp(-max(0.0, -scene(p - n * 0.12)) * 22.0);
	col += vec3(1.0, 0.006, 0.19) * thin * (0.1 + 0.7 * pow(max(dot(rd, BACK), 0.0), 3.0));
	float F = 0.035 + 0.965 * pow(1.0 - clamp(dot(n, -rd), 0.0, 1.0), 5.0);
	vec3 rf = reflect(rd, n);
	col = col * (1.0 - F) + env(rf) * F * (0.55 + 0.45 * occ);
	col += vec3(1.0, 0.95, 0.97) * (pow(max(dot(rf, KEY), 0.0), 110.0) * 2.0) * occ;

	col = 1.0 - exp(-col * 1.6);
	col = pow(col, vec3(1.0 / 2.2));
	// Right before the camera goes under, the surface flattens into the section colour.
	col = mix(col, BRAND, smoothstep(5.1, 6.6, uLevel));
	outColor = vec4(col * alpha, alpha);
}`;

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
	const shader = gl.createShader(type);
	if (!shader) throw new Error('createShader failed');
	gl.shaderSource(shader, src);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		const message = gl.getShaderInfoLog(shader) ?? 'shader compile failed';
		gl.deleteShader(shader);
		throw new Error(message);
	}
	return shader;
}

function program(gl: WebGL2RenderingContext, vs: string, fs: string): WebGLProgram {
	const p = gl.createProgram();
	if (!p) throw new Error('createProgram failed');
	const shaders: WebGLShader[] = [];
	try {
		shaders.push(compile(gl, gl.VERTEX_SHADER, vs));
		shaders.push(compile(gl, gl.FRAGMENT_SHADER, fs));
		for (const shader of shaders) gl.attachShader(p, shader);
		gl.linkProgram(p);
		if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
			throw new Error(gl.getProgramInfoLog(p) ?? 'program link failed');
		}
		return p;
	} catch (error) {
		gl.deleteProgram(p);
		throw error;
	} finally {
		for (const shader of shaders) gl.deleteShader(shader);
	}
}

type Vec3 = readonly [number, number, number];

export interface CrownFrame {
	/** Backing-pixel point (GL origin, bottom-left) the camera target lands on. */
	principal: readonly [number, number];
	focal: number;
	cam: Vec3;
	right: Vec3;
	up: Vec3;
	fwd: Vec3;
	time: number;
	dropTime: number;
	h: number;
	arm: number;
	flare: number;
	lag: number;
	lean: readonly [number, number];
	level: number;
	poolR: number;
	ringR: number;
	ringA: number;
	slopeK: number;
	ptr: Vec3;
	box: Vec3;
}

const UNIFORMS = [
	'uRes',
	'uPrincipal',
	'uFocal',
	'uCam',
	'uRight',
	'uUp',
	'uFwd',
	'uTime',
	'uDropTime',
	'uH',
	'uArm',
	'uFlare',
	'uLag',
	'uLean',
	'uLevel',
	'uPoolR',
	'uRingR',
	'uRingA',
	'uSlopeK',
	'uPtr',
	'uBox'
] as const;

export class CrownRenderer {
	private readonly u: Record<(typeof UNIFORMS)[number], WebGLUniformLocation | null>;
	private readonly vao: WebGLVertexArrayObject | null;

	private constructor(
		private readonly gl: WebGL2RenderingContext,
		private readonly prog: WebGLProgram
	) {
		this.u = Object.fromEntries(
			UNIFORMS.map((name) => [name, gl.getUniformLocation(prog, name)])
		) as typeof this.u;
		this.vao = gl.createVertexArray();
	}

	/** Null when WebGL2 or the shader is unavailable; callers show the static fallback. */
	static create(canvas: HTMLCanvasElement, steps: number): CrownRenderer | null {
		const gl = canvas.getContext('webgl2', {
			alpha: true,
			premultipliedAlpha: true,
			antialias: false,
			depth: false,
			stencil: false,
			powerPreference: 'low-power'
		});
		if (!gl) return null;
		try {
			return new CrownRenderer(gl, program(gl, VS, FS.replace('STEPS', String(steps | 0))));
		} catch (error) {
			console.warn('[liquid] shader unavailable', error);
			return null;
		}
	}

	resize(width: number, height: number): void {
		const canvas = this.gl.canvas as HTMLCanvasElement;
		if (canvas.width !== width || canvas.height !== height) {
			canvas.width = width;
			canvas.height = height;
		}
	}

	render(f: CrownFrame): void {
		const { gl, u } = this;
		const { width, height } = gl.canvas;
		gl.viewport(0, 0, width, height);
		gl.useProgram(this.prog);
		gl.uniform2f(u.uRes, width, height);
		gl.uniform2f(u.uPrincipal, f.principal[0], f.principal[1]);
		gl.uniform1f(u.uFocal, f.focal);
		gl.uniform3f(u.uCam, ...f.cam);
		gl.uniform3f(u.uRight, ...f.right);
		gl.uniform3f(u.uUp, ...f.up);
		gl.uniform3f(u.uFwd, ...f.fwd);
		gl.uniform1f(u.uTime, f.time);
		gl.uniform1f(u.uDropTime, f.dropTime);
		gl.uniform1f(u.uH, f.h);
		gl.uniform1f(u.uArm, f.arm);
		gl.uniform1f(u.uFlare, f.flare);
		gl.uniform1f(u.uLag, f.lag);
		gl.uniform2f(u.uLean, f.lean[0], f.lean[1]);
		gl.uniform1f(u.uLevel, f.level);
		gl.uniform1f(u.uPoolR, f.poolR);
		gl.uniform1f(u.uRingR, f.ringR);
		gl.uniform1f(u.uRingA, f.ringA);
		gl.uniform1f(u.uSlopeK, f.slopeK);
		gl.uniform3f(u.uPtr, ...f.ptr);
		gl.uniform3f(u.uBox, ...f.box);
		gl.bindVertexArray(this.vao);
		gl.drawArrays(gl.TRIANGLES, 0, 3);
	}

	dispose(): void {
		this.gl.deleteProgram(this.prog);
		this.gl.deleteVertexArray(this.vao);
		this.gl.getExtension('WEBGL_lose_context')?.loseContext();
	}
}
