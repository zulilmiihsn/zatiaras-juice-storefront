// Rasterized liquid sheet: deformation runs on a bounded mesh, once per vertex.
// The fragment shader only lights the surface; it never traces rays through it.
// The top edge follows a simulated wave line; droplets thrown by colliding crests
// are drawn as lit, velocity-stretched sphere impostors in the same material.
import { FIELD_BOTTOM, FIELD_HEIGHT, FIELD_TOP, FIELD_WIDTH, SurfaceWaves } from './surface-waves';
import {
	CREST_BASE,
	DROPLET_STRIDE,
	LINE_CELLS,
	MAX_DROPLETS,
	WaveLine,
	shapeCrest
} from './wave-line';
type Vec3 = readonly [number, number, number];

export interface WaveFrame {
	/** Backing-pixel point (GL origin, bottom-left) the camera target lands on. */
	principal: readonly [number, number];
	focal: number;
	cam: Vec3;
	right: Vec3;
	up: Vec3;
	fwd: Vec3;
	time: number;
	/** Swell energy: 0 is a calm, wind-stirred surface; 1 is fully driven colliding waves. */
	h: number;
	lag: number;
	level: number;
}

export function liquidBackingSize(
	width: number,
	height: number,
	dpr: number,
	scale: number,
	coarse: boolean
) {
	const w = Number.isFinite(width) ? Math.max(2, Math.min(32768, width)) : 2;
	const h = Number.isFinite(height) ? Math.max(2, Math.min(32768, height)) : 2;
	const density = Number.isFinite(dpr) ? Math.max(1, Math.min(1.5, dpr)) : 1;
	const quality = Number.isFinite(scale) ? Math.max(0.4, Math.min(1, scale)) : 1;
	const budget = coarse ? 450000 : 900000;
	const factor = Math.min(density, Math.sqrt(budget / (w * h))) * quality;
	return {
		width: Math.max(2, Math.floor(w * factor)),
		height: Math.max(2, Math.floor(h * factor))
	};
}

const PROJECT = `
uniform vec2 uRes, uPrincipal;
uniform vec3 uCam, uRight, uUp, uFwd;
uniform float uFocal;
vec4 project(vec3 p) {
	vec3 delta = p - uCam;
	float depth = dot(delta, uFwd);
	vec2 center = 2.0 * uPrincipal / uRes - 1.0;
	vec2 projected = 2.0 * uFocal * vec2(dot(delta, uRight) * uRes.y / uRes.x, dot(delta, uUp));
	return vec4(center * depth + projected, 1.002503 * depth - 0.20025, depth);
}`;

const VS = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aUv;
uniform highp sampler2D uRippleField, uLine;
uniform float uTime, uH, uLag, uLevel, uSpan;
out vec3 vWorld, vNormal;
out float vDepth, vShade;
${PROJECT}

float rippleAt(vec2 position) {
	vec2 uv = vec2(position.x / (2.0 * uSpan) + 0.5, (position.y - ${FIELD_BOTTOM.toFixed(1)}) / ${(FIELD_TOP - FIELD_BOTTOM).toFixed(1)});
	if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) return 0.0;
	ivec2 size = textureSize(uRippleField, 0), edge = size - 1;
	vec2 coord = uv * vec2(size - 1);
	ivec2 cell = ivec2(floor(coord));
	vec2 f = fract(coord);
	float a = texelFetch(uRippleField, clamp(cell, ivec2(0), edge), 0).r;
	float b = texelFetch(uRippleField, clamp(cell + ivec2(1, 0), ivec2(0), edge), 0).r;
	float c = texelFetch(uRippleField, clamp(cell + ivec2(0, 1), ivec2(0), edge), 0).r;
	float d = texelFetch(uRippleField, clamp(cell + ivec2(1, 1), ivec2(0), edge), 0).r;
	return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// x: edge height, y: broad blur of it for the body below.
vec2 lineCell(int i) {
	return texelFetch(uLine, ivec2(clamp(i, 0, ${LINE_CELLS - 1}), 0), 0).rg;
}

// Catmull-Rom across the simulated line, so crests stay smooth between cells.
vec2 lineAt(float x) {
	float c = clamp((x / (2.0 * uSpan) + 0.5) * ${(LINE_CELLS - 1).toFixed(1)}, 0.0, ${(LINE_CELLS - 1).toFixed(1)});
	int i = int(floor(c));
	float t = c - float(i);
	vec2 p0 = lineCell(i - 1), p1 = lineCell(i), p2 = lineCell(i + 1), p3 = lineCell(i + 2);
	return p1 + 0.5 * t * (p2 - p0 + t * (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3 + t * (3.0 * (p1 - p2) + p3 - p0)));
}

float shapeCrest(float e) {
	return e + 0.8 * max(e, 0.0) * max(e, 0.0) + 0.3 * min(e, 0.0) * min(e, 0.0);
}

float crest(float x) {
	// Wind chop on top of the simulated swell; it grows with the swell energy.
	// Long, low wind chop only: short ripples on the silhouette read as a serrated edge.
	float chop = (1.0 + uH) * (0.008 * sin(x * 3.1 - uTime * 2.2) + 0.005 * sin(x * 5.2 + uTime * 2.9 + 1.7));
	return ${CREST_BASE.toFixed(3)} + shapeCrest(lineAt(x).x) + chop;
}

// Travelling waves across the face in several oblique directions. They are not
// aligned with the crest columns, so the face moves as one fluid surface rather
// than as vertical strips that rise and fall with the edge.
float faceWaves(vec2 p) {
	p += 0.25 * sin(p.yx * vec2(0.9, 1.3) + uTime * vec2(0.5, 0.4));
	float s = 0.0;
	s += sin(dot(p, vec2(1.3, -2.1)) + uTime * 2.6);
	s += 0.8 * sin(dot(p, vec2(-1.8, -1.5)) + uTime * 2.3 + 1.7);
	s += 0.6 * sin(dot(p, vec2(2.6, -0.7)) + uTime * 3.1 + 0.4);
	s += 0.45 * sin(dot(p, vec2(-0.9, -3.2)) + uTime * 3.4 + 2.9);
	s += 0.3 * sin(dot(p, vec2(3.7, 1.4)) - uTime * 3.9 + 4.1);
	return s / 3.15;
}

vec4 surface(vec2 uv) {
	float x = uv.x * uSpan;
	float top = crest(x);
	// Concentrate rows on the visible shoulder, rather than far below it.
	float t = uv.y;
	float curve = 1.0 - pow(1.0 - t, 1.4);
	// Crest detail fades out with depth below the surface; deeper liquid follows the
	// blurred line. Weighting by depth, not by mesh row, leaves no moving seam.
	float body = ${CREST_BASE.toFixed(3)} + shapeCrest(lineAt(x).y);
	float lipDepth = (top + 10.0) * (1.0 - curve);
	float guide = mix(body, top, exp(-lipDepth / 0.3));
	float y = mix(-10.0, guide, curve);
	float depth = top - y;
	// The forward curl of the face follows the smooth guide, not the detailed crest;
	// otherwise every crest bump bends its whole column and the face shows vertical ridges.
	float bodyDepth = guide - y;
	float z = 1.05 * (1.0 - exp(-bodyDepth * bodyDepth * 1.1)) - 0.08 * bodyDepth;
	float fold = exp(-pow((bodyDepth - 0.75) / 1.15, 2.0)) * smoothstep(0.0, 0.4, bodyDepth);
	float shoulder = body + 0.2 + 0.18 * sin(x * 0.8 - 0.4 + uTime * 0.22);
	z += 0.22 * exp(-pow((y - shoulder + 0.45) / 0.65, 2.0)) * smoothstep(0.0, 0.4, depth);
	z += fold * 0.075 * sin(x * 0.9 + bodyDepth * 1.1 - uTime * 1.3);
	z += (0.022 + 0.05 * min(uH, 1.0)) * faceWaves(vec2(x, y)) * smoothstep(0.0, 0.35, depth);
	z += uLag * 0.25 * fold;
	z += rippleAt(vec2(x, y));
	return vec4(x, y + uLevel, z, depth);
}

// Shadow cast by taller waves on the light's side (upper left), plus ambient
// occlusion where the edge sits in a trough. Strongest near the surface.
float occlusion(float x, float depth) {
	float own = crest(x);
	float shadow = 0.0;
	for (int k = 1; k <= 5; k++) {
		float d = 0.22 * float(k);
		shadow = max(shadow, smoothstep(0.0, 0.3, crest(x - d) - own - 1.1 * d) * (1.0 - 0.12 * float(k)));
	}
	float body = ${CREST_BASE.toFixed(3)} + shapeCrest(lineAt(x).y);
	float trough = smoothstep(0.02, 0.35, body - own);
	return clamp(max(shadow, 0.75 * trough) * exp(-max(depth, 0.0) * 0.35), 0.0, 1.0);
}

void main() {
	if (uLevel > 6.6) {
		gl_Position = vec4(aUv.x, aUv.y * 2.0 - 1.0, 0.0, 1.0);
		vWorld = vec3(0.0); vNormal = vec3(0.0, 0.0, 1.0); vDepth = 1.0; vShade = 0.0;
		return;
	}
	vec4 point = surface(aUv);
	vec3 p = point.xyz;
	vec3 dx = surface(aUv + vec2(0.0005, 0.0)).xyz - surface(aUv - vec2(0.0005, 0.0)).xyz;
	vec3 dy = surface(aUv + vec2(0.0, 0.0005)).xyz - surface(aUv - vec2(0.0, 0.0005)).xyz;
	vec3 n = normalize(cross(dx, dy));
	vWorld = p; vNormal = n; vDepth = point.w;
	vShade = occlusion(p.x, point.w);
	gl_Position = project(p);
}`;

const SHADE = `
uniform vec3 uCam;
uniform float uLevel, uTime;
const vec3 PINK = vec3(1.0, 0.0627451, 0.5058824);

float panel(vec3 ray, vec3 direction, vec2 extent) {
	float facing = dot(ray, direction);
	if (facing <= 0.0) return 0.0;
	vec3 right = normalize(cross(direction, vec3(0.0, 1.0, 0.0)));
	vec3 up = cross(right, direction);
	vec2 uv = vec2(dot(ray, right), dot(ray, up)) / facing;
	vec2 scaled = uv / extent;
	// Flat-topped softboxes with a short falloff: a smooth liquid film mirrors crisp
	// light shapes, while broad blurred lobes read as gel or plastic.
	return exp(-pow(dot(scaled, scaled), 1.6) * 2.5);
}

// Soft environment: a warm bright sky above the horizon, deep pink below it, so
// up-facing slopes catch light and down-facing slopes read as darker.
vec3 sky(vec3 ray) {
	return mix(vec3(0.1, 0.02, 0.06), vec3(0.34, 0.26, 0.24), smoothstep(-0.15, 0.6, ray.y));
}

vec3 studio(vec3 ray) {
	vec3 light = sky(ray);
	light += 14.0 * panel(ray, normalize(vec3(-0.45, 0.7, 0.55)), vec2(0.26, 0.2));
	light += 9.0 * panel(ray, normalize(vec3(0.1, 0.45, 0.9)), vec2(0.14, 0.12));
	light += 6.0 * panel(ray, normalize(vec3(0.8, 0.25, 0.55)), vec2(0.11, 0.1));
	light += 2.0 * panel(ray, normalize(vec3(-0.2, -0.35, 0.9)), vec2(0.3, 0.04));
	return light;
}

vec3 tonemap(vec3 color) {
	return clamp((color * (2.51 * color + 0.03)) / (color * (2.43 * color + 0.59) + 0.14), 0.0, 1.0);
}

vec3 shade(vec3 world, vec3 n, float bodyDepth, float occluded) {
	// Fine capillary waves travel down the face with the flow, so the glints keep
	// streaming like a liquid film instead of sitting still on a solid surface.
	// A slow domain warp bends the wavefronts so they never form a regular grid.
	vec2 flowPosition = vec2(world.x, world.y - uLevel);
	flowPosition += 0.18 * sin(flowPosition.yx * vec2(2.3, 1.7) + uTime * vec2(0.9, 0.7));
	float w1 = sin(dot(flowPosition, vec2(7.0, 11.0)) + uTime * 4.6);
	float w2 = sin(dot(flowPosition, vec2(-10.0, 8.0)) + uTime * 3.7);
	n = normalize(n + vec3(0.024 * w1 - 0.016 * w2, 0.018 * w2 + 0.014 * w1, 0.0));
	vec3 view = normalize(uCam - world);
	vec3 light = normalize(vec3(-0.45, 0.7, 0.55));
	float facing = max(dot(n, view), 0.0);
	float fresnel = 0.0204 + 0.9796 * pow(1.0 - facing, 5.0);
	vec3 reflection = reflect(-view, n);
	// Colors are authored in display space. A bounded pink shadow preserves the
	// supplied reference's bright hue instead of a dark red HDR/tone-map result.
	// Lighting is evaluated in linear space, then returned to display space.
	// The dyed liquid is opaque: the background never shows through. Light scattered
	// inside the body re-emerges as a glow in the same dye hue, strongest on the thin
	// crest and at grazing angles, so it brightens edges without shifting the pink.
	vec3 dye = pow(vec3(1.0, 0.035, 0.4), vec3(2.2));
	// Shadowed liquid loses direct light and most of its glints; deeper liquid
	// absorbs a little more, so the body darkens gently away from the surface.
	float deep = smoothstep(0.6, 3.2, bodyDepth);
	float dim = max(occluded, 0.35 * deep);
	float diffuse = max(dot(n, light), 0.0) * (1.0 - 0.8 * occluded);
	float thin = 1.0 - smoothstep(0.0, 0.9, bodyDepth);
	float rim = pow(1.0 - facing, 2.0);
	vec3 body = dye * ((0.3 - 0.12 * dim) + 0.8 * diffuse + 0.2 * rim + 0.06 * thin);
	vec3 lit = body * (1.0 - fresnel) + studio(reflection) * fresnel * (1.0 - 0.55 * occluded);
	// Only at the silhouette, grazing reflections pick up the page's cream backdrop,
	// so the edge melts into the background instead of drawing a dark outline.
	lit += (vec3(0.75, 0.68, 0.58) - sky(reflection)) * fresnel * smoothstep(0.8, 0.98, 1.0 - facing);
	vec3 color = pow(tonemap(lit * 1.4), vec3(1.0 / 2.2));
	color = max(color, mix(vec3(0.74, 0.015, 0.33), vec3(0.5, 0.0, 0.2), dim));
	return mix(color, PINK, smoothstep(5.1, 6.6, uLevel));
}`;

const FS = `#version 300 es
precision highp float;
in vec3 vWorld, vNormal;
in float vDepth, vShade;
out vec4 outColor;
${SHADE}
void main() {
	if (uLevel > 6.6) { outColor = vec4(PINK, 1.0); return; }
	vec3 n = normalize(vNormal);
	if (!gl_FrontFacing) n = -n;
	outColor = vec4(shade(vWorld, n, vDepth, vShade), 1.0);
}`;

// Splash, pass 1: each parcel adds a soft density blob to a half-resolution buffer,
// stretched along its screen-plane velocity. Overlapping blobs merge.
const DROP_VS = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aCorner;
layout(location = 1) in vec4 aDrop;
layout(location = 2) in vec3 aVel;
out vec2 vLocal;
${PROJECT}
void main() {
	vec3 v = aVel - dot(aVel, uFwd) * uFwd;
	float speed = length(v);
	vec3 axis = speed > 0.001 ? v / speed : uUp;
	vec3 side = normalize(cross(uFwd, axis));
	float stretch = 1.0 + min(speed * 0.22, 2.2);
	vLocal = aCorner;
	vec3 offset = (axis * aCorner.y * stretch + side * aCorner.x) * aDrop.w * 2.0;
	gl_Position = project(aDrop.xyz + offset);
}`;

const DROP_FS = `#version 300 es
precision highp float;
in vec2 vLocal;
out vec4 outColor;
void main() {
	float r2 = dot(vLocal, vLocal);
	if (r2 > 1.0) discard;
	float density = exp(-r2 * 4.0) - 0.0183;
	outColor = vec4(density, 0.0, 0.0, 0.0);
}`;

// Splash, pass 2: the merged density is drawn as one liquid surface. Where parcels
// crowd together it reads as a sheet; where they drift apart it thins into ligaments
// and tears into drops. Normals come from the density gradient.
const COMP_VS = `#version 300 es
precision highp float;
out vec2 vUv;
void main() {
	vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
	vUv = p;
	gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const COMP_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uSplash;
uniform vec2 uRes, uPrincipal;
uniform vec3 uRight, uUp, uFwd;
uniform float uFocal;
out vec4 outColor;
${SHADE}
void main() {
	vec2 texel = 1.0 / vec2(textureSize(uSplash, 0));
	float d = texture(uSplash, vUv).r;
	float alpha = smoothstep(0.32, 0.46, d);
	if (alpha <= 0.0) discard;
	float gx = texture(uSplash, vUv + vec2(texel.x, 0.0)).r - texture(uSplash, vUv - vec2(texel.x, 0.0)).r;
	float gy = texture(uSplash, vUv + vec2(0.0, texel.y)).r - texture(uSplash, vUv - vec2(0.0, texel.y)).r;
	vec3 n = normalize(-uRight * gx * 4.0 - uUp * gy * 4.0 - uFwd);
	// Reconstruct a world point on the splash plane for view direction and glints.
	vec2 pixel = gl_FragCoord.xy;
	vec2 uv = (pixel - uPrincipal) / uRes.y;
	vec3 ray = uFwd * uFocal + uRight * uv.x + uUp * uv.y;
	vec3 world = uCam + ray * ((0.3 - uCam.z) / min(ray.z, -0.01));
	float thickness = clamp((d - 0.4) * 1.2, 0.0, 1.0);
	vec3 color = shade(world, n, thickness, 0.0);
	outColor = vec4(color * alpha, alpha);
}`;

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
	const shader = gl.createShader(type);
	if (!shader) throw new Error('createShader failed');
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		const message = gl.getShaderInfoLog(shader) || 'shader compile failed';
		gl.deleteShader(shader);
		throw new Error(message);
	}
	return shader;
}

function program(gl: WebGL2RenderingContext, vs: string, fs: string) {
	const result = gl.createProgram();
	if (!result) throw new Error('createProgram failed');
	const shaders: WebGLShader[] = [];
	try {
		shaders.push(compile(gl, gl.VERTEX_SHADER, vs));
		shaders.push(compile(gl, gl.FRAGMENT_SHADER, fs));
		for (const shader of shaders) gl.attachShader(result, shader);
		gl.linkProgram(result);
		if (!gl.getProgramParameter(result, gl.LINK_STATUS))
			throw new Error(gl.getProgramInfoLog(result) || 'program link failed');
		return result;
	} catch (error) {
		gl.deleteProgram(result);
		throw error;
	} finally {
		for (const shader of shaders) gl.deleteShader(shader);
	}
}

function mesh(gl: WebGL2RenderingContext, columns: number, rows: number) {
	const vertices = new Float32Array((columns + 1) * (rows + 1) * 2);
	const indices = new Uint16Array(columns * rows * 6);
	for (let y = 0; y <= rows; y++)
		for (let x = 0; x <= columns; x++) {
			const i = (y * (columns + 1) + x) * 2;
			vertices[i] = (x / columns) * 2 - 1;
			vertices[i + 1] = y / rows;
		}
	let next = 0;
	for (let y = 0; y < rows; y++)
		for (let x = 0; x < columns; x++) {
			const i = y * (columns + 1) + x;
			indices.set([i, i + 1, i + columns + 1, i + 1, i + columns + 2, i + columns + 1], next);
			next += 6;
		}
	const vao = gl.createVertexArray(),
		vertex = gl.createBuffer(),
		index = gl.createBuffer();
	if (!vao || !vertex || !index) {
		gl.deleteVertexArray(vao);
		gl.deleteBuffer(vertex);
		gl.deleteBuffer(index);
		throw new Error('mesh allocation failed');
	}
	gl.bindVertexArray(vao);
	gl.bindBuffer(gl.ARRAY_BUFFER, vertex);
	gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
	gl.enableVertexAttribArray(0);
	gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
	return { vao, vertex, index, count: indices.length };
}

function dropletMesh(gl: WebGL2RenderingContext) {
	const vao = gl.createVertexArray(),
		corner = gl.createBuffer(),
		instance = gl.createBuffer();
	if (!vao || !corner || !instance) {
		gl.deleteVertexArray(vao);
		gl.deleteBuffer(corner);
		gl.deleteBuffer(instance);
		throw new Error('droplet allocation failed');
	}
	gl.bindVertexArray(vao);
	gl.bindBuffer(gl.ARRAY_BUFFER, corner);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
	gl.enableVertexAttribArray(0);
	gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
	gl.bindBuffer(gl.ARRAY_BUFFER, instance);
	gl.bufferData(gl.ARRAY_BUFFER, MAX_DROPLETS * DROPLET_STRIDE * 4, gl.DYNAMIC_DRAW);
	const stride = DROPLET_STRIDE * 4;
	gl.enableVertexAttribArray(1);
	gl.vertexAttribPointer(1, 4, gl.FLOAT, false, stride, 0);
	gl.vertexAttribDivisor(1, 1);
	gl.enableVertexAttribArray(2);
	gl.vertexAttribPointer(2, 3, gl.FLOAT, false, stride, 16);
	gl.vertexAttribDivisor(2, 1);
	gl.bindVertexArray(null);
	return { vao, corner, instance };
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
	'uH',
	'uLag',
	'uLevel',
	'uRippleField',
	'uLine',
	'uSpan'
] as const;
const DROP_UNIFORMS = [
	'uRes',
	'uPrincipal',
	'uFocal',
	'uCam',
	'uRight',
	'uUp',
	'uFwd',
	'uTime',
	'uLevel'
] as const;
const COMP_UNIFORMS = [...DROP_UNIFORMS, 'uSplash'] as const;

function locations<T extends readonly string[]>(
	gl: WebGL2RenderingContext,
	prog: WebGLProgram,
	names: T
) {
	return Object.fromEntries(
		names.map((name) => [name, gl.getUniformLocation(prog, name)])
	) as Record<T[number], WebGLUniformLocation | null>;
}

function floatTexture(
	gl: WebGL2RenderingContext,
	width: number,
	height: number,
	data: Float32Array,
	channels: 1 | 2 = 1
) {
	const texture = gl.createTexture();
	if (!texture) throw new Error('surface texture allocation failed');
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texImage2D(
		gl.TEXTURE_2D,
		0,
		channels === 2 ? gl.RG32F : gl.R32F,
		width,
		height,
		0,
		channels === 2 ? gl.RG : gl.RED,
		gl.FLOAT,
		data
	);
	return texture;
}

export class WaveRenderer {
	private readonly uniforms: ReturnType<typeof locations<typeof UNIFORMS>>;
	private readonly dropUniforms: ReturnType<typeof locations<typeof DROP_UNIFORMS>>;
	private readonly compUniforms: ReturnType<typeof locations<typeof COMP_UNIFORMS>>;
	// Half-resolution density buffer for the splash surface.
	private readonly splashFbo: WebGLFramebuffer;
	private readonly splashTexture: WebGLTexture;
	private readonly emptyVao: WebGLVertexArrayObject;
	private splashSize = [0, 0];
	private readonly sheet: ReturnType<typeof mesh>;
	private readonly drops: ReturnType<typeof dropletMesh>;
	private readonly field = new SurfaceWaves();
	private readonly line = new WaveLine();
	private readonly rippleTexture: WebGLTexture;
	private readonly lineTexture: WebGLTexture;
	private uploadedVersion = -1;
	private uploadedLine = -1;
	private lastFrame: WaveFrame | null = null;
	private constructor(
		private readonly gl: WebGL2RenderingContext,
		private readonly prog: WebGLProgram,
		private readonly dropProg: WebGLProgram,
		private readonly compProg: WebGLProgram,
		coarse: boolean
	) {
		this.uniforms = locations(gl, prog, UNIFORMS);
		this.dropUniforms = locations(gl, dropProg, DROP_UNIFORMS);
		this.compUniforms = locations(gl, compProg, COMP_UNIFORMS);
		const fbo = gl.createFramebuffer(),
			texture = gl.createTexture(),
			vao = gl.createVertexArray();
		if (!fbo || !texture || !vao) throw new Error('splash buffer allocation failed');
		this.splashFbo = fbo;
		this.splashTexture = texture;
		this.emptyVao = vao;
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		this.sheet = mesh(gl, coarse ? 224 : 448, coarse ? 64 : 88);
		this.drops = dropletMesh(gl);
		this.rippleTexture = floatTexture(gl, FIELD_WIDTH, FIELD_HEIGHT, this.field.data);
		this.lineTexture = floatTexture(gl, LINE_CELLS, 1, this.line.texels, 2);
		gl.enable(gl.DEPTH_TEST);
	}
	/** Null when WebGL2 or the shader is unavailable; callers show the static fallback. */
	static create(canvas: HTMLCanvasElement, coarse: boolean): WaveRenderer | null {
		let gl: WebGL2RenderingContext | null = null;
		const programs: WebGLProgram[] = [];
		try {
			gl = canvas.getContext('webgl2', {
				alpha: true,
				premultipliedAlpha: true,
				antialias: true,
				depth: true,
				stencil: false,
				powerPreference: 'low-power'
			});
			if (!gl) return null;
			programs.push(program(gl, VS, FS));
			programs.push(program(gl, DROP_VS, DROP_FS));
			programs.push(program(gl, COMP_VS, COMP_FS));
			return new WaveRenderer(gl, programs[0], programs[1], programs[2], coarse);
		} catch (error) {
			for (const prog of programs) gl?.deleteProgram(prog);
			gl?.getExtension('WEBGL_lose_context')?.loseContext();
			console.warn('[liquid] shader unavailable', error);
			return null;
		}
	}
	resize(width: number, height: number) {
		const canvas = this.gl.canvas as HTMLCanvasElement;
		if (canvas.width !== width || canvas.height !== height) {
			canvas.width = width;
			canvas.height = height;
		}
	}
	/** True while ripples or droplets are in motion and need full-rate frames. */
	get disturbed() {
		return this.field.active || this.line.active;
	}
	disturbAt(x: number, y: number, strength: number) {
		const f = this.lastFrame;
		if (
			!f ||
			f.level > 6.6 ||
			![x, y, strength].every(Number.isFinite) ||
			x < 0 ||
			x > 1 ||
			y < 0 ||
			y > 1
		)
			return;
		const { width, height } = this.gl.canvas;
		const u = (x * width - f.principal[0]) / height;
		const v = ((1 - y) * height - f.principal[1]) / height;
		const ray = f.fwd.map((value, i) => value * f.focal + f.right[i] * u + f.up[i] * v);
		if (ray[2] >= -0.01) return;
		const t = (0.8 - f.cam[2]) / ray[2];
		if (t <= 0) return;
		const worldX = f.cam[0] + ray[0] * t;
		const localY = f.cam[1] + ray[1] * t - f.level;
		const top = CREST_BASE + shapeCrest(this.line.at(worldX));
		if (localY > top + 0.6) return;
		this.field.impulse(worldX, localY, strength);
		// Touching the crest itself pushes the edge up; a hard tap can splash.
		if (localY > top - 0.45) this.line.impulse(worldX, strength * 1.6);
	}
	render(f: WaveFrame) {
		const { gl, uniforms: u } = this;
		const { width, height } = gl.canvas;
		const span = Math.max(3.1, (((f.cam[2] / f.focal) * width) / height) * 0.58 + 1.2);
		const seconds = this.lastFrame ? f.time - this.lastFrame.time : 0;
		this.field.setSpan(span);
		this.field.advance(seconds, f.lag * 10);
		this.line.setSpan(span);
		this.line.advance(seconds, f.h, f.level);
		this.lastFrame = f;
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.rippleTexture);
		if (this.uploadedVersion !== this.field.version) {
			gl.texSubImage2D(
				gl.TEXTURE_2D,
				0,
				0,
				0,
				FIELD_WIDTH,
				FIELD_HEIGHT,
				gl.RED,
				gl.FLOAT,
				this.field.data
			);
			this.uploadedVersion = this.field.version;
		}
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, this.lineTexture);
		if (this.uploadedLine !== this.line.version) {
			gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, LINE_CELLS, 1, gl.RG, gl.FLOAT, this.line.texels);
			this.uploadedLine = this.line.version;
		}
		gl.viewport(0, 0, width, height);
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		gl.useProgram(this.prog);
		this.camera(u, f, width, height);
		gl.uniform1f(u.uH, f.h);
		gl.uniform1f(u.uLag, f.lag);
		gl.uniform1i(u.uRippleField, 0);
		gl.uniform1i(u.uLine, 1);
		gl.uniform1f(u.uSpan, span);
		gl.bindVertexArray(this.sheet.vao);
		gl.drawElements(gl.TRIANGLES, this.sheet.count, gl.UNSIGNED_SHORT, 0);

		const count = this.line.dropletCount;
		if (count > 0 && f.level <= 6.6) {
			this.drawSplash(f, width, height, count);
		}
		gl.bindVertexArray(null);
	}
	private drawSplash(f: WaveFrame, width: number, height: number, count: number) {
		const { gl } = this;
		const w = Math.max(1, Math.ceil(width / 2)),
			h = Math.max(1, Math.ceil(height / 2));
		gl.bindTexture(gl.TEXTURE_2D, this.splashTexture);
		if (this.splashSize[0] !== w || this.splashSize[1] !== h) {
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
			gl.bindFramebuffer(gl.FRAMEBUFFER, this.splashFbo);
			gl.framebufferTexture2D(
				gl.FRAMEBUFFER,
				gl.COLOR_ATTACHMENT0,
				gl.TEXTURE_2D,
				this.splashTexture,
				0
			);
			this.splashSize = [w, h];
		}
		// Pass 1: accumulate parcel density.
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.splashFbo);
		gl.viewport(0, 0, w, h);
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.disable(gl.DEPTH_TEST);
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.ONE, gl.ONE);
		gl.useProgram(this.dropProg);
		this.camera(this.dropUniforms, f, width, height);
		gl.bindVertexArray(this.drops.vao);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.drops.instance);
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.line.droplets.subarray(0, count * DROPLET_STRIDE));
		gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
		// Pass 2: draw the density as a liquid surface over the body.
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.viewport(0, 0, width, height);
		gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
		gl.useProgram(this.compProg);
		this.camera(this.compUniforms, f, width, height);
		gl.activeTexture(gl.TEXTURE2);
		gl.bindTexture(gl.TEXTURE_2D, this.splashTexture);
		gl.uniform1i(this.compUniforms.uSplash, 2);
		gl.bindVertexArray(this.emptyVao);
		gl.drawArrays(gl.TRIANGLES, 0, 3);
		gl.disable(gl.BLEND);
		gl.enable(gl.DEPTH_TEST);
	}
	private camera(
		u: Record<(typeof DROP_UNIFORMS)[number], WebGLUniformLocation | null>,
		f: WaveFrame,
		width: number,
		height: number
	) {
		const { gl } = this;
		gl.uniform2f(u.uRes, width, height);
		gl.uniform2f(u.uPrincipal, ...f.principal);
		gl.uniform1f(u.uFocal, f.focal);
		gl.uniform3f(u.uCam, ...f.cam);
		gl.uniform3f(u.uRight, ...f.right);
		gl.uniform3f(u.uUp, ...f.up);
		gl.uniform3f(u.uFwd, ...f.fwd);
		gl.uniform1f(u.uTime, f.time);
		gl.uniform1f(u.uLevel, f.level);
	}
	dispose() {
		const { gl } = this;
		gl.deleteTexture(this.rippleTexture);
		gl.deleteTexture(this.lineTexture);
		gl.deleteVertexArray(this.sheet.vao);
		gl.deleteBuffer(this.sheet.vertex);
		gl.deleteBuffer(this.sheet.index);
		gl.deleteVertexArray(this.drops.vao);
		gl.deleteBuffer(this.drops.corner);
		gl.deleteBuffer(this.drops.instance);
		gl.deleteProgram(this.prog);
		gl.deleteProgram(this.dropProg);
		gl.deleteProgram(this.compProg);
		gl.deleteFramebuffer(this.splashFbo);
		gl.deleteTexture(this.splashTexture);
		gl.deleteVertexArray(this.emptyVao);
		gl.getExtension('WEBGL_lose_context')?.loseContext();
	}
}
