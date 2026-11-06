// GLSL for Liquid 2. Every pass shares one projection, so the drink quad and the surface
// mesh write comparable depth and occlude each other per pixel.
// The material is copied from Liquid 1 ($lib/liquid1/wave), re-aimed for a camera that
// looks down on a horizontal pool: its studio panels sit behind the liquid as well as in
// front, so both the flat surface and the wave faces catch crisp highlights.

export const NEAR = 0.05;
export const FAR = 60;
export const DENSITY_TILES = 8;
export const DENSITY_SLICES = 12;

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
	float r2 = dot(scaled, scaled);
	float lobe = r2 * r2;
	return 1.0 / (1.0 + 10.0 * lobe * lobe);
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
	lit += 2.2 * panel(reflection, normalize(vec3(-0.55, 0.12, -0.83)), vec2(0.38, 0.45))
		* fresnel * (1.0 - abs(n.y)) * smoothstep(0.02, 0.18, world.y - uLevel);
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
// The former field texture is replaced by CPU-built positions and shared vertex normals,
// including the simulated pool, the broad shoulder and the rolling crest in one surface.
// The swirl ribbon formerly had its own surface; its position/normal shader is now the
// pool shader, so the wave passes in front of and behind the drink without a separate join.
export const SURFACE_VS = `#version 300 es
precision highp float;
layout(location = 0) in vec3 aPos;

out vec3 vWorld;

${COMMON}

void main() {
	vWorld = aPos;


	gl_Position = project(aPos);
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
uniform vec3 uCupProfile; // bottom radius, base y, height
out vec4 outColor;
${COMMON}
void main() {
	vec4 color = texture(uImage, vUv);
	if (color.a < 0.5) discard;
	vec3 ray = pixelRay(gl_FragCoord.xy);
	vec2 oc = uCam.xz - uCylinder.xy;
	float taper = (uCylinder.z - uCupProfile.x) / max(0.001, uCupProfile.z);
	float cameraRadius = uCupProfile.x + taper * (uCam.y - uCupProfile.y);
	float radialRay = taper * ray.y;
	float a = dot(ray.xz, ray.xz) - radialRay * radialRay;
	float b = 2.0 * (dot(oc, ray.xz) - cameraRadius * radialRay);
	float c = dot(oc, oc) - cameraRadius * cameraRadius;
	float disc = b * b - 4.0 * a * c;
	// Outside the cylinder's silhouette (straw, lid overhang) use the axis plane.
	float depth = disc > 0.0
		? (-b - sqrt(disc)) / (2.0 * a)
		: dot(vec3(uCylinder.x, uCylinder.w, uCylinder.y) - uCam, uFwd);
	gl_FragDepth = windowDepth(depth);
	outColor = vec4(color.rgb, 1.0);
}`;

const DEPTH_PACK = `
vec4 encodeDepth(float depth, float alpha) {
	float value = clamp(depth / FAR, 0.0000001, 0.9999999);
	vec3 encoded = fract(value * vec3(1.0, 255.0, 65025.0));
	encoded -= encoded.yzz * vec3(1.0 / 255.0, 1.0 / 255.0, 0.0);
	return vec4(encoded, alpha);
}
float decodeDepth(vec4 value) {
	return dot(value.rgb, vec3(1.0, 1.0 / 255.0, 1.0 / 65025.0)) * FAR;
}
`;

// Pool and particles first write the same linear-depth surface. RGB24 works without
// floating-point colour attachments, including devices without EXT_color_buffer_float.
export const DEPTH_FS = `#version 300 es
precision highp float;
in vec3 vWorld;
out vec4 outColor;
${COMMON}
${DEPTH_PACK}
void main() {
	outColor = encodeDepth(dot(vWorld - uCam, uFwd), farFade(vWorld.z));
}`;

export const SHEET_VS = `#version 300 es
precision highp float;
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNormal;
uniform float uFilmScale;
out vec3 vWorld;
out vec3 vNormal;
${COMMON}
void main() {
	vWorld = aPos;
	vNormal = aNormal;
	gl_Position = project(vWorld);
}`;

export const SHEET_FS = `#version 300 es
precision highp float;
in vec3 vWorld;
in vec3 vNormal;
uniform float uFilmScale;
uniform vec4 uCup;
uniform float uCupBase, uCupBottom;
out vec4 outColor;
${COMMON}
${SHADE}
void main() {
	float t = clamp((vWorld.y - uCupBase) / max(0.001, uCup.w - uCupBase), 0.0, 1.0);
	float radius = mix(uCupBottom, uCup.z, t);
	vec2 d = vWorld.xz - uCup.xy;
	if (vWorld.y > uCupBase && vWorld.y < uCup.w && dot(d, d) < radius * radius) discard;
	float normalLength = dot(vNormal, vNormal);
	vec3 n = normalLength > 1e-10 ? vNormal * inversesqrt(normalLength) : normalize(uCam - vWorld);
	if (dot(n, uCam - vWorld) < 0.0) n = -n;
	float height = (vWorld.y - uLevel) / uFilmScale;
	n = normalize(mix(vec3(0.0, 1.0, 0.0), n, smoothstep(0.0, 0.08, height)));
	outColor = vec4(shade(vWorld, n, mix(0.9, 0.02, smoothstep(0.0, 0.12, height)), 0.0), 1.0);
}`;

export const SCREEN_VS = `#version 300 es
precision highp float;
out vec2 vUv;
void main() {
	vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
	vUv = p;
	gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

export const BLUR_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uDepth;
uniform vec2 uDirection, uDepthSize;
uniform float uFluidScale;
out vec4 outColor;
${COMMON}
${DEPTH_PACK}
void main() {
	vec4 centre = texture(uDepth, vUv);
	float reference = centre.a > 0.01 ? decodeDepth(centre) : FAR;
	if (centre.a <= 0.01) {
		for (int r = 1; r <= 2; r++) {
			vec4 a = texture(uDepth, vUv + float(r) * uDirection / uDepthSize);
			vec4 b = texture(uDepth, vUv - float(r) * uDirection / uDepthSize);
			if (a.a > 0.01 || b.a > 0.01) {
				reference = a.a > b.a ? decodeDepth(a) : decodeDepth(b);
				break;
			}
		}
	}
	if (reference >= FAR) { outColor = vec4(0.0); return; }
	float sum = 0.0, weight = 0.0, coverage = 0.0, spatialSum = 0.0;
	float sigma = max(0.025, 0.18 * uFluidScale);
	for (int r = -2; r <= 2; r++) {
		float spatial = exp(-float(r * r) / 3.0);
		spatialSum += spatial;
		vec4 value = texture(uDepth, vUv + float(r) * uDirection / uDepthSize);
		if (value.a < 0.001) continue;
		float depth = decodeDepth(value);
		float delta = (depth - reference) / sigma;
		float w = spatial * exp(-delta * delta * 0.5) * value.a;
		sum += w * depth;
		weight += w;
		coverage += spatial * value.a;
	}
	outColor = weight > 0.00001 ? encodeDepth(sum / weight, coverage / spatialSum) : vec4(0.0);
}`;

const ATLAS_SAMPLE = `
uniform highp sampler2D uVolume;
uniform highp sampler2D uHeight;
uniform vec3 uVolumeOrigin, uVolumeExtent, uVolumeResolution;
uniform vec2 uAtlasSize;
uniform vec4 uHeightDomain;
uniform float uDensityScale;
uniform float uSupport;
float sliceDensity(vec2 uv, float slice) {
	vec2 tile = vec2(mod(slice, ${DENSITY_TILES.toFixed(1)}), floor(slice / ${DENSITY_TILES.toFixed(1)}));
	vec2 local = clamp(uv * uVolumeResolution.xy - 0.5, vec2(0.0), uVolumeResolution.xy - 1.0);
	vec2 atlasUv = (tile * uVolumeResolution.xy + local + 0.5) / uAtlasSize;
	return textureLod(uVolume, atlasUv, 0.0).r * uDensityScale;
}
float volumeDensity(vec3 world) {
	vec3 uv = (world - uVolumeOrigin) / uVolumeExtent;
	float fluid = 0.0;
	if (all(greaterThanEqual(uv, vec3(0.0))) && all(lessThanEqual(uv, vec3(1.0)))) {
		float z = clamp(uv.z * uVolumeResolution.z - 0.5, 0.0, uVolumeResolution.z - 1.0);
		float layer = floor(z);
		fluid = mix(sliceDensity(uv.xy, layer), sliceDensity(uv.xy, min(layer + 1.0, uVolumeResolution.z - 1.0)), fract(z));
	}
	vec2 heightUv = (world.xz - uHeightDomain.xy) / uHeightDomain.zw;
	float height = 0.0;
	if (all(greaterThanEqual(heightUv, vec2(0.0))) && all(lessThanEqual(heightUv, vec2(1.0)))) height = textureLod(uHeight, heightUv, 0.0).r;
	float band = uSupport;
	float pool = clamp(0.5 + (uLevel + height - world.y) / max(0.001, band), 0.0, 1.0);
	pool = pool * pool * (3.0 - 2.0 * pool);
	float difference = fluid - pool;
	return 0.5 * (fluid + pool + sqrt(difference * difference + 0.0064));
}
`;

// Conservative screen coverage avoids ray marching pixels outside every kernel.
export const MASK_VS = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aCorner;
layout(location = 2) in vec4 aParticle;
uniform float uSupport;
${COMMON}
void main() {
	vec4 centre = project(aParticle.xyz);
	float bound = 1.8 * uSupport;
	vec2 radius = vec2(2.0 * uFocal / uAspect, 2.0 * uFocal) * bound * centre.w / max(NEAR, centre.w - bound);
	centre.xy += (aCorner * 2.0 - 1.0) * radius;
	gl_Position = aParticle.w > 0.0 ? centre : vec4(2.0, 2.0, 2.0, 1.0);
}`;
export const MASK_FS = `#version 300 es
precision highp float;
out vec4 outColor;
void main() { outColor = vec4(1.0); }
`;

export const DENSITY_VS = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aCorner;
layout(location = 2) in vec4 aParticle;
layout(location = 3) in vec3 aKernel0;
layout(location = 4) in vec3 aKernel1;
layout(location = 5) in vec3 aKernel2;
uniform vec3 uVolumeOrigin, uVolumeExtent, uVolumeResolution;
uniform vec2 uAtlasSize;
uniform float uSupport;
flat out vec4 vParticle;
flat out float vSlice;
flat out vec2 vTile;
flat out mat3 vKernel;
void main() {
	vParticle = aParticle;
	vKernel = mat3(aKernel0, aKernel1, aKernel2);
	float centre = (aParticle.z - uVolumeOrigin.z) / uVolumeExtent.z * uVolumeResolution.z - 0.5;
	vSlice = floor(centre) - ${(DENSITY_SLICES / 2 - 1).toFixed(1)} + float(gl_InstanceID % ${DENSITY_SLICES});
	vTile = vec2(mod(vSlice, ${DENSITY_TILES.toFixed(1)}), floor(vSlice / ${DENSITY_TILES.toFixed(1)})) * uVolumeResolution.xy;
	if (vSlice < 0.0 || vSlice >= uVolumeResolution.z) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
	float z = uVolumeOrigin.z + (vSlice + 0.5) / uVolumeResolution.z * uVolumeExtent.z - aParticle.z;
	float bound = uSupport * 1.35;
	float reach = sqrt(max(0.0, bound * bound - z * z));
	vec2 world = aParticle.xy + (aCorner * 2.0 - 1.0) * reach;
	vec2 pixel = vTile + (world - uVolumeOrigin.xy) / uVolumeExtent.xy * uVolumeResolution.xy;
	gl_Position = vec4(pixel / uAtlasSize * 2.0 - 1.0, 0.0, 1.0);
}`;

export const DENSITY_FS = `#version 300 es
precision highp float;
flat in vec4 vParticle;
flat in float vSlice;
flat in vec2 vTile;
flat in mat3 vKernel;
uniform vec3 uVolumeOrigin, uVolumeExtent, uVolumeResolution;
uniform float uSupport, uKernelScale;
out vec4 outColor;
void main() {
	vec2 local = gl_FragCoord.xy - vTile;
	if (any(lessThan(local, vec2(0.0))) || any(greaterThanEqual(local, uVolumeResolution.xy))) discard;
	vec3 world = uVolumeOrigin + vec3(local / uVolumeResolution.xy, (vSlice + 0.5) / uVolumeResolution.z) * uVolumeExtent;
	vec3 delta = vKernel * (world - vParticle.xyz);
	float q = dot(delta, delta) / (uSupport * uSupport);
	if (q >= 1.0) discard;
	float w = 1.0 - q;
	outColor = vec4(w * w * w * vParticle.w * uKernelScale, 0.0, 0.0, 0.0);
}`;

export const COMPOSITE_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uDepth;
uniform vec2 uDepthSize;
uniform float uVolumeActive;
out vec4 outColor;
${COMMON}
${DEPTH_PACK}
${SHADE}
${ATLAS_SAMPLE}
vec3 reconstruct(vec2 uv, float depth) {
	return uCam + pixelRay(uv * uRes) * depth;
}
vec3 neighbour(vec2 uv, float fallback) {
	vec4 value = texture(uDepth, uv);
	return reconstruct(uv, value.a > 0.01 ? decodeDepth(value) : fallback);
}
void main() {
	vec4 value = texture(uDepth, vUv);
	if (value.a < 0.003) discard;
	float depth = decodeDepth(value);
	vec3 world = reconstruct(vUv, depth);
	vec2 step = 1.0 / uDepthSize;
	vec3 right = neighbour(vUv + vec2(step.x, 0.0), depth) - world;
	vec3 left = world - neighbour(vUv - vec2(step.x, 0.0), depth);
	vec3 up = neighbour(vUv + vec2(0.0, step.y), depth) - world;
	vec3 down = world - neighbour(vUv - vec2(0.0, step.y), depth);
	vec3 dx = abs(dot(right, uFwd)) < abs(dot(left, uFwd)) ? right : left;
	vec3 dy = abs(dot(up, uFwd)) < abs(dot(down, uFwd)) ? up : down;
	vec3 normal = cross(dx, dy);
	float lengthSquared = dot(normal, normal);
	normal = lengthSquared > 1e-12 ? normal * inversesqrt(lengthSquared) : normalize(uCam - world);
	if (dot(normal, uCam - world) < 0.0) normal = -normal;
	vec3 volumeUv = (world - uVolumeOrigin) / uVolumeExtent;
	if (uVolumeActive > 0.5 && all(greaterThan(volumeUv, vec3(0.02))) && all(lessThan(volumeUv, vec3(0.98)))) {
		vec3 e = 1.0 / uVolumeResolution;
		vec3 d = uVolumeExtent * e;
		vec3 gradient = vec3(
			volumeDensity(world + vec3(d.x, 0.0, 0.0)) - volumeDensity(world - vec3(d.x, 0.0, 0.0)),
			volumeDensity(world + vec3(0.0, d.y, 0.0)) - volumeDensity(world - vec3(0.0, d.y, 0.0)),
			volumeDensity(world + vec3(0.0, 0.0, d.z)) - volumeDensity(world - vec3(0.0, 0.0, d.z))
		) / d;
		float density = volumeDensity(world);
		if (density > 0.3 && density < 0.7 && dot(gradient, gradient) > 0.000001) normal = -normalize(gradient);
	}
	float height = world.y - uLevel;
	float bodyDepth = max(0.05, 0.9 - 1.5 * max(height, 0.0));
	float occluded = 0.6 * smoothstep(0.02, 0.3, -height);
	float alpha = world.y > uLevel + 0.06 ? smoothstep(0.28, 0.52, value.a) : value.a;
	gl_FragDepth = windowDepth(depth);
	outColor = vec4(shade(world, normal, bodyDepth, occluded) * alpha, alpha);
}`;

// Ray-cast the SPH density isosurface. A parcel's sphere is only a sampling kernel;
// the rendered water is the combined density field, including its union with the pool.
export const VOLUME_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform vec4 uSolidCylinder;
uniform sampler2D uMask;
uniform float uSolidBase, uSolidBottom;
out vec4 outColor;
${COMMON}
${DEPTH_PACK}
${ATLAS_SAMPLE}
float densityAt(vec3 world) {
	vec3 uv = (world - uVolumeOrigin) / uVolumeExtent;
	if (any(lessThan(uv, vec3(0.0))) || any(greaterThan(uv, vec3(1.0)))) return 0.0;
	float fraction = clamp((world.y - uSolidBase) / max(0.001, uSolidCylinder.w - uSolidBase), 0.0, 1.0);
	float radius = mix(uSolidBottom, uSolidCylinder.z, fraction);
	vec2 delta = world.xz - uSolidCylinder.xy;
	if (world.y > uSolidBase && world.y < uSolidCylinder.w && dot(delta, delta) < radius * radius) return 0.0;
	return volumeDensity(world);
}
void main() {
	if (texture(uMask, vUv).a < 0.5) discard;
	vec3 ray = pixelRay(gl_FragCoord.xy);
	vec3 safeRay = mix(ray, vec3(0.000001), lessThan(abs(ray), vec3(0.000001)));
	vec3 a = (uVolumeOrigin - uCam) / safeRay;
	vec3 b = (uVolumeOrigin + uVolumeExtent - uCam) / safeRay;
	vec3 nearAxis = min(a, b), farAxis = max(a, b);
	float start = max(NEAR, max(nearAxis.x, max(nearAxis.y, nearAxis.z)));
	float finish = min(FAR, min(farAxis.x, min(farAxis.y, farAxis.z)));
	if (finish <= start) discard;
	vec3 voxel = uVolumeExtent / uVolumeResolution;
	vec3 cellRay = abs(ray) / voxel;
	float stepLength = max(0.5 / max(cellRay.x, max(cellRay.y, cellRay.z)), 0.22 * uSupport);
	float before = start;
	for (int i = 0; i < 160; i++) {
		float depth = start + float(i) * stepLength;
		if (depth > finish) break;
		if (densityAt(uCam + ray * depth) >= 0.5) {
			float low = before, high = depth;
			for (int refine = 0; refine < 7; refine++) {
				float middle = (low + high) * 0.5;
				if (densityAt(uCam + ray * middle) >= 0.5) high = middle; else low = middle;
			}
			float surface = (low + high) * 0.5;
			gl_FragDepth = windowDepth(surface);
			outColor = encodeDepth(surface, 1.0);
			return;
		}
		before = depth;
	}
	discard;
}`;
