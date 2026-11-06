// GLSL for Liquid 2. Every pass shares one projection, so the drink quad and the surface
// mesh write comparable depth and occlude each other per pixel.
// The material is copied from Liquid 1 ($lib/liquid1/wave), re-aimed for a camera that
// looks down on a horizontal pool: its studio panels sit behind the liquid as well as in
// front, so both the flat surface and the wave faces catch crisp highlights.

export const NEAR = 0.05;
export const FAR = 60;

const COMMON = `
uniform vec3 uCam, uRight, uUp, uFwd;
uniform float uFocal, uAspect, uShift, uTime, uLevel, uCover;
uniform vec2 uRes;
// World z over which the far edge of the pool melts into the page (back edge, fully opaque).
uniform vec2 uFade;
const float NEAR = ${NEAR.toFixed(2)}, FAR = ${FAR.toFixed(1)};
const vec3 PINK = vec3(1.0, 0.0627451, 0.5058824);

vec4 project(vec3 p) {
	vec3 d = p - uCam;
	float depth = dot(d, uFwd);
	return vec4(
		2.0 * uFocal * dot(d, uRight) / uAspect,
		2.0 * uFocal * dot(d, uUp) - 2.0 * uShift * depth,
		(FAR + NEAR) / (FAR - NEAR) * depth - 2.0 * FAR * NEAR / (FAR - NEAR),
		depth
	);
}

// Opacity by distance: the pool's far edge fades out instead of ending on a hard line.
// Under full cover everything is opaque.
float farFade(float z) {
	return mix(smoothstep(uFade.x, uFade.y, z), 1.0, uCover);
}

// Window depth for a view depth, matching what project() produces through the rasterizer.
float windowDepth(float depth) {
	float ndc = (FAR + NEAR) / (FAR - NEAR) - 2.0 * FAR * NEAR / ((FAR - NEAR) * max(depth, NEAR));
	return 0.5 * ndc + 0.5;
}

// Ray through a pixel, scaled so dot(ray, uFwd) == 1: the ray parameter is the view depth.
vec3 pixelRay(vec2 frag) {
	vec2 ndc = frag / uRes * 2.0 - 1.0;
	return uFwd + uRight * (ndc.x * uAspect / (2.0 * uFocal)) + uUp * ((ndc.y + 2.0 * uShift) / (2.0 * uFocal));
}
`;

const SHADE = `
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

vec3 sky(vec3 ray) {
	return mix(vec3(0.1, 0.02, 0.06), vec3(0.34, 0.26, 0.24), smoothstep(-0.15, 0.6, ray.y));
}

vec3 studio(vec3 ray) {
	vec3 light = sky(ray);
	// Behind the pool: what its flat, gently tilted surface mirrors toward the camera.
	light += 11.0 * panel(ray, normalize(vec3(-0.45, 0.55, -0.7)), vec2(0.3, 0.12));
	light += 7.0 * panel(ray, normalize(vec3(0.5, 0.35, -0.8)), vec2(0.16, 0.08));
	// A long, low softbox just above the horizon: the level camera's grazing reflections
	// land here, drawing long highlight streaks along the swells.
	light += 1.6 * panel(ray, normalize(vec3(-0.25, 0.1, -1.0)), vec2(0.5, 0.035));
	// In front, as in Liquid 1: what the wave faces turned toward the camera mirror.
	light += 9.0 * panel(ray, normalize(vec3(-0.45, 0.7, 0.55)), vec2(0.26, 0.2));
	light += 5.0 * panel(ray, normalize(vec3(0.8, 0.25, 0.55)), vec2(0.11, 0.1));
	return light;
}

vec3 tonemap(vec3 color) {
	return clamp((color * (2.51 * color + 0.03)) / (color * (2.43 * color + 0.59) + 0.14), 0.0, 1.0);
}

vec3 shade(vec3 world, vec3 n, float bodyDepth, float occluded) {
	// Fine capillary waves drift across the surface so glints keep moving like a film.
	vec2 flow = world.xz;
	flow += 0.18 * sin(flow.yx * vec2(2.3, 1.7) + uTime * vec2(0.9, 0.7));
	float w1 = sin(dot(flow, vec2(7.0, 11.0)) + uTime * 4.6);
	float w2 = sin(dot(flow, vec2(-10.0, 8.0)) + uTime * 3.7);
	// Far away these ripples are finer than a pixel and alias into stripes; fade them out.
	float distance = length(uCam - world);
	float ripple = 1.0 / (1.0 + 0.12 * distance * distance);
	n = normalize(n + ripple * vec3(0.024 * w1 - 0.016 * w2, 0.0, 0.018 * w2 + 0.014 * w1));
	vec3 view = normalize(uCam - world);
	vec3 light = normalize(vec3(-0.45, 0.7, 0.55));
	float facing = max(dot(n, view), 0.0);
	// The level camera sees the pool at grazing angles, where full Fresnel would mirror the
	// pale sky over the whole surface; cap it so the dye stays magenta and highlights stay crisp.
	float fresnel = min(0.5, 0.0204 + 0.9796 * pow(1.0 - facing, 5.0));
	vec3 reflection = reflect(-view, n);
	// Opaque dyed liquid, lit in linear space; light scattered inside re-emerges as a glow
	// in the dye hue, strongest on thin crests and at grazing angles.
	vec3 dye = pow(vec3(1.0, 0.035, 0.4), vec3(2.2));
	float deep = smoothstep(0.6, 3.2, bodyDepth);
	float dim = max(occluded, 0.35 * deep);
	float diffuse = max(dot(n, light), 0.0) * (1.0 - 0.8 * occluded);
	float thin = 1.0 - smoothstep(0.0, 0.9, bodyDepth);
	float rim = pow(1.0 - facing, 2.0);
	vec3 body = dye * ((0.3 - 0.12 * dim) + 0.8 * diffuse + 0.2 * rim + 0.06 * thin);
	vec3 lit = body * (1.0 - fresnel) + studio(reflection) * fresnel * (1.0 - 0.55 * occluded);
	// At the silhouette, grazing reflections pick up the page's cream backdrop.
	// Only on steep faces (crest silhouettes), not on the flat pool seen edge-on.
	lit += (vec3(0.75, 0.68, 0.58) - sky(reflection)) * fresnel * smoothstep(0.8, 0.98, 1.0 - facing)
		* (1.0 - abs(n.y));
	vec3 color = pow(tonemap(lit * 1.4), vec3(1.0 / 2.2));
	color = max(color, mix(vec3(0.74, 0.015, 0.33), vec3(0.5, 0.0, 0.2), dim));
	return mix(color, PINK, uCover);
}
`;

// The pool: one vertex per simulation cell plus a flat skirt reaching under the camera.
// The field texture holds height offset, cell-centred velocity and a wall mask (r, g, b, a).
export const SURFACE_VS = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aXZ;
uniform highp sampler2D uField;
uniform vec4 uDomain; // x0, z0, dx, dz
uniform ivec2 uCells;
out vec3 vWorld, vNormal;
out float vHeight;
${COMMON}

vec4 cell(vec2 xz) {
	ivec2 k = ivec2(floor((xz - uDomain.xy) / uDomain.zw));
	if (any(lessThan(k, ivec2(0))) || any(greaterThanEqual(k, uCells))) return vec4(0.0, 0.0, 0.0, 1.0);
	return texelFetch(uField, k, 0);
}

float shapeCrest(float e) {
	return e + 0.8 * max(e, 0.0) * max(e, 0.0) + 0.3 * min(e, 0.0) * min(e, 0.0);
}

vec3 place(vec2 xz) {
	vec4 c = cell(xz);
	vec2 step = uDomain.zw;
	vec2 slope = vec2(
		cell(xz + vec2(step.x, 0.0)).r - cell(xz - vec2(step.x, 0.0)).r,
		cell(xz + vec2(0.0, step.y)).r - cell(xz - vec2(0.0, step.y)).r
	) / (2.0 * step);
	// Points slide toward crests (sharper peaks, broader troughs) and crests lean along
	// the flow, so a travelling swell curls forward instead of rising as a sine bump.
	// Beside the drink (mask 0) the surface stays unshaped: one side of those cells is
	// wall, and leaning or peaking them folds the run-up face into shards.
	vec2 offset = c.a * (0.05 * slope + 0.22 * max(c.r, 0.0) * c.gb);
	// Never move a vertex past its neighbours: folded triangles render as shards.
	float reach = 0.45 * min(step.x, step.y);
	float len = length(offset);
	if (len > reach) offset *= reach / len;
	return vec3(xz.x + offset.x, uLevel + mix(c.r, shapeCrest(c.r), c.a), xz.y + offset.y);
}

void main() {
	vec2 step = uDomain.zw;
	vec3 p = place(aXZ);
	vec3 ddx = place(aXZ + vec2(step.x, 0.0)) - place(aXZ - vec2(step.x, 0.0));
	vec3 ddz = place(aXZ + vec2(0.0, step.y)) - place(aXZ - vec2(0.0, step.y));
	vWorld = p;
	vNormal = normalize(cross(ddz, ddx));
	vHeight = p.y - uLevel;
	gl_Position = project(p);
}`;

export const SURFACE_FS = `#version 300 es
precision highp float;
in vec3 vWorld, vNormal;
in float vHeight;
out vec4 outColor;
${COMMON}
${SHADE}
void main() {
	vec3 n = normalize(vNormal);
	if (!gl_FrontFacing) n = -n;
	float bodyDepth = max(0.05, 0.9 - 1.5 * max(vHeight, 0.0));
	float occluded = 0.6 * smoothstep(0.02, 0.3, -vHeight);
	float alpha = farFade(vWorld.z);
	outColor = vec4(shade(vWorld, n, bodyDepth, occluded) * alpha, alpha);
}`;

// The drink photo as a screen-aligned quad. Its depth is the cylinder proxy's front face
// under each pixel, so liquid in front of the cylinder covers it and liquid behind is hidden.
export const DRINK_VS = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aCorner;
uniform vec4 uRect; // left, top, right, bottom as canvas fractions from the top-left
out vec2 vUv;
void main() {
	vUv = aCorner;
	vec2 p = vec2(mix(uRect.x, uRect.z, aCorner.x), mix(uRect.y, uRect.w, aCorner.y));
	gl_Position = vec4(p.x * 2.0 - 1.0, 1.0 - p.y * 2.0, 0.0, 1.0);
}`;

export const DRINK_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uImage;
uniform vec4 uCylinder; // x, z, radius, mid-height y
out vec4 outColor;
${COMMON}
void main() {
	vec4 color = texture(uImage, vUv);
	if (color.a < 0.5) discard;
	vec3 ray = pixelRay(gl_FragCoord.xy);
	vec2 oc = uCam.xz - uCylinder.xy;
	float a = dot(ray.xz, ray.xz);
	float b = 2.0 * dot(oc, ray.xz);
	float c = dot(oc, oc) - uCylinder.z * uCylinder.z;
	float disc = b * b - 4.0 * a * c;
	// Outside the cylinder's silhouette (straw, lid overhang) use the axis plane.
	float depth = disc > 0.0
		? (-b - sqrt(disc)) / (2.0 * a)
		: dot(vec3(uCylinder.x, uCylinder.w, uCylinder.y) - uCam, uFwd);
	gl_FragDepth = windowDepth(depth);
	outColor = vec4(color.rgb, 1.0);
}`;

// The swirl ribbon: positions and normals are built on the CPU each frame; it shares the
// pool's material (SURFACE_FS) and depth, so it passes in front of and behind the drink.
export const RIBBON_VS = `#version 300 es
precision highp float;
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNormal;
out vec3 vWorld, vNormal;
out float vHeight;
${COMMON}
void main() {
	vWorld = aPos;
	vNormal = aNormal;
	vHeight = aPos.y - uLevel;
	gl_Position = project(aPos);
}`;
