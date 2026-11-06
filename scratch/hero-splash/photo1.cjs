const fs = require('fs');
let s;
const rep = (a, b) => {
	if (!s.includes(a)) throw new Error('missing: ' + a.slice(0, 70));
	s = s.replace(a, () => b);
};

// ---------- renderer ----------
let f = 'src/lib/liquid/renderer.ts';
s = fs.readFileSync(f, 'utf8');
rep("import type { Crown } from './crown';\n", '');
rep(
	'const BLUR_FS = ',
	`const PHOTO_VS = \`#version 300 es
const vec2 verts[4] = vec2[4](vec2(0.0, 0.0), vec2(1.0, 0.0), vec2(0.0, 1.0), vec2(1.0, 1.0));
uniform vec4 uRect;   // world x, y, w, h (y down)
uniform float uAspect;
out vec2 vUv;
void main() {
	vec2 q = verts[gl_VertexID];
	vUv = q; // v down, like the image
	vec2 w = uRect.xy + q * uRect.zw;
	gl_Position = vec4(w.x / uAspect * 2.0 - 1.0, 1.0 - w.y * 2.0, 0.0, 1.0);
}\`;

// The approved splash render, flexed like a thick liquid: height-weighted flow
// (the pool stays put, the arms move), a spring bend per arm and a dent that
// follows the pointer. Colours stay those of the photograph.
const PHOTO_FS = \`#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uTex;
uniform float uTime;
uniform vec2 uBend;   // left / right arm bend, uv units
uniform vec3 uPtr;    // uv x, y, push strength
uniform float uAlpha;
out vec4 outColor;

vec2 disp(vec2 uv) {
	float h = clamp(1.0 - uv.y, 0.0, 1.0);
	float hw = pow(h, 1.4);
	// Two crossing travelling waves read as slow viscous flow along the arms.
	vec2 d = vec2(
		sin(uv.y * 8.0 - uTime * 1.5 + sin(uv.x * 5.0 + uTime * 0.8) * 1.6),
		cos(uv.x * 9.0 + uTime * 1.2 + uv.y * 5.0)
	) * 0.0075 * hw;
	d += vec2(
		sin(uv.y * 17.0 - uTime * 2.6) * 0.0028 * hw,
		sin(uv.x * 21.0 + uTime * 2.1) * 0.0022 * hw
	);
	// Arms swing from the root: displacement grows with height squared.
	d.x += mix(uBend.x, uBend.y, smoothstep(0.38, 0.62, uv.x)) * h * h;
	// Pointer dent: liquid pushed away, stronger higher up.
	vec2 dp = (uv - uPtr.xy) * vec2(1.5, 1.0);
	float g = exp(-dot(dp, dp) / 0.035);
	d += normalize(dp + 1e-4) * uPtr.z * g * (0.3 + 0.7 * h);
	return d;
}

void main() {
	vec2 e = vec2(0.002, 0.002);
	vec2 d = disp(vUv);
	vec4 c = texture(uTex, vUv - d);
	// Compression highlights: brighten where the flow converges, dim where it spreads.
	float div = (disp(vUv + vec2(e.x, 0.0)).x - disp(vUv - vec2(e.x, 0.0)).x
		+ disp(vUv + vec2(0.0, e.y)).y - disp(vUv - vec2(0.0, e.y)).y) / (2.0 * e.x);
	c.rgb *= 1.0 - clamp(div, -1.0, 1.0) * 0.35;
	c.rgb += vec3(max(0.0, -div) * 0.06) * c.a;
	outColor = c * uAlpha;
}\`;

const BLUR_FS = `
);
rep(
	'\tprivate readonly crownVao: WebGLVertexArrayObject;\n\tprivate readonly crownBuffer: WebGLBuffer;\n',
	'\tprivate readonly photo: WebGLProgram;\n\tprivate photoTex: WebGLTexture | null = null;\n'
);
rep(
	'\t\tthis.blur = program(gl, QUAD_VS, BLUR_FS);',
	"\t\tthis.blur = program(gl, QUAD_VS, BLUR_FS);\n\t\tthis.photo = program(gl, PHOTO_VS, PHOTO_FS);\n\t\tfor (const name of ['uRect', 'uAspect', 'uTex', 'uTime', 'uBend', 'uPtr', 'uAlpha']) {\n\t\t\tthis.u[`photo.${name}`] = gl.getUniformLocation(this.photo, name);\n\t\t}"
);
rep(
	`		const crownVao = gl.createVertexArray();
		const crownBuffer = gl.createBuffer();
		if (!crownVao || !crownBuffer) throw new Error('WebGL allocation failed');
		this.crownVao = crownVao;
		this.crownBuffer = crownBuffer;
`,
	''
);
rep(
	`		gl.bindVertexArray(crownVao);
		gl.bindBuffer(gl.ARRAY_BUFFER, crownBuffer);
		gl.enableVertexAttribArray(0);
		gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 12, 0);
		gl.enableVertexAttribArray(1);
		gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 12, 8);
`,
	''
);
rep(
	'\trender(sim: LiquidSim, crown: Crown, frame: FrameState): void {',
	`	/** Loads the splash photograph (premultiplied alpha). Resolves false on failure. */
	async setPhoto(url: string): Promise<boolean> {
		const gl = this.gl;
		try {
			const response = await fetch(url);
			const bitmap = await createImageBitmap(await response.blob(), {
				premultiplyAlpha: 'premultiply'
			});
			const tex = gl.createTexture();
			if (!tex) return false;
			gl.bindTexture(gl.TEXTURE_2D, tex);
			gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
			gl.generateMipmap(gl.TEXTURE_2D);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			if (this.photoTex) gl.deleteTexture(this.photoTex);
			this.photoTex = tex;
			bitmap.close();
			return true;
		} catch {
			return false;
		}
	}

	render(sim: LiquidSim, photo: PhotoState, frame: FrameState): void {`
);
rep(
	`		gl.drawArrays(gl.POINTS, 0, sim.capacity);
		gl.bindVertexArray(this.crownVao);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.crownBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, crown.points, gl.STREAM_DRAW);
		gl.drawArrays(gl.POINTS, 0, crown.count);
		gl.bindVertexArray(null);`,
	`		gl.drawArrays(gl.POINTS, 0, sim.capacity);
		gl.bindVertexArray(null);`
);
rep(
	`		gl.drawArrays(gl.TRIANGLES, 0, 3);
	}

	dispose(): void {`,
	`		gl.drawArrays(gl.TRIANGLES, 0, 3);

		// Pass 3: the photographic splash, on top of droplets and wave.
		if (this.photoTex && photo.alpha > 0) {
			gl.enable(gl.BLEND);
			gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
			gl.useProgram(this.photo);
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, this.photoTex);
			gl.uniform1i(this.u['photo.uTex'], 0);
			gl.uniform4f(
				this.u['photo.uRect'],
				photo.rect.x,
				photo.rect.y + photo.sink,
				photo.rect.w,
				photo.rect.h
			);
			gl.uniform1f(this.u['photo.uAspect'], aspect);
			gl.uniform1f(this.u['photo.uTime'], frame.time);
			gl.uniform2f(this.u['photo.uBend'], photo.bend[0], photo.bend[1]);
			gl.uniform3f(this.u['photo.uPtr'], photo.ptr[0], photo.ptr[1], photo.ptr[2]);
			gl.uniform1f(this.u['photo.uAlpha'], photo.alpha);
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
			gl.disable(gl.BLEND);
		}
	}

	dispose(): void {`
);
rep(
	'\t\tgl.deleteVertexArray(this.crownVao);\n\t\tgl.deleteBuffer(this.crownBuffer);\n',
	'\t\tgl.deleteProgram(this.photo);\n\t\tif (this.photoTex) gl.deleteTexture(this.photoTex);\n'
);
rep(
	'export interface FrameState {',
	`export interface PhotoState {
	rect: { x: number; y: number; w: number; h: number };
	/** World-unit downward offset (the crown sinks into the wave). */
	sink: number;
	alpha: number;
	bend: ArrayLike<number>;
	ptr: ArrayLike<number>;
}

export interface FrameState {`
);
fs.writeFileSync(f, s);

// ---------- component ----------
f = 'src/lib/components/LiquidSplash.svelte';
s = fs.readFileSync(f, 'utf8');
rep("\timport { Crown } from '$lib/liquid/crown';", "\timport { Splash, type SplashRect } from '$lib/liquid/splash';");
rep(
	'\t\tconst crown = new Crown();',
	"\t\tconst splash = new Splash();\n\t\tlet photoRect: SplashRect = { x: 0, y: 0, w: 1, h: 1 };\n\t\tlet portraitNow = false;\n\t\tlet photoKind = '';"
);
rep(
	`			const portrait = aspect < 0.9;
			sim.setLayout({
				aspect,
				cx: (portrait ? 0.5 : anchorX) * aspect,
				cy: portrait ? 0.9 : anchorY,
				size: portrait ? Math.min(size * 0.68, aspect * 0.95) : Math.min(size, aspect * 0.36)
			});`,
	`			const portrait = aspect < 0.9;
			portraitNow = portrait;
			const cx = (portrait ? 0.5 : anchorX) * aspect;
			// Image sits on the pool: bottom edge slightly below the anchor.
			const w = portrait ? Math.min(aspect * 1.0, 0.72) : Math.min(size * 1.5, aspect * 0.56);
			const h = w * (portrait ? 1536 / 1024 : 1024 / 1536);
			photoRect = { x: cx - w / 2, y: (portrait ? 1.0 : anchorY + 0.1) - h, w, h };
			sim.setLayout({ aspect, cx, cy: photoRect.y + photoRect.h * 0.9, size: h * 0.9 });
			const kind = portrait ? 'mobile' : 'desktop';
			if (kind !== photoKind) {
				photoKind = kind;
				void renderer.setPhoto(\`/images/hero/splash-\${kind}.webp\`);
			}`
);
rep(
	`			crown.presence = 1 - smooth(0.2, 0.55, p);
			crown.update(now / 1000, Math.min(dt, 50) / 1000, sim.layout, pointer, sim);
`,
	'			splash.update(now / 1000, Math.min(dt, 50) / 1000, photoRect, portraitNow, pointer, sim);\n'
);
rep(
	`			const { cx, cy, size: crownSize } = sim.layout;
			const speed = Math.hypot(pointer.vx, pointer.vy);
			if (
				pointer.active &&
				speed > 1.2 &&
				Math.abs(pointer.x - cx) < crownSize * 0.8 &&
				pointer.y < cy + crownSize * 0.1 &&
				pointer.y > cy - crownSize * 1.05
			) {`,
	`			const speed = Math.hypot(pointer.vx, pointer.vy);
			if (
				pointer.active &&
				speed > 1.4 &&
				pointer.x > photoRect.x &&
				pointer.x < photoRect.x + photoRect.w &&
				pointer.y > photoRect.y &&
				pointer.y < photoRect.y + photoRect.h * 0.7
			) {`
);
rep(
	'\t\t\trenderer.render(sim, crown, {',
	`			const sink = smooth(0.1, 0.55, p) * (1.25 - photoRect.y);
			renderer.render(
				sim,
				{ rect: photoRect, sink, alpha: 1, bend: splash.bend, ptr: splash.ptr },
				{`
);
rep(
	`				time: now / 1000,
				wave,
				waveAmp: 0.03 + 0.05 * Math.sin(Math.PI * p),
				pool: 1 - smooth(0.1, 0.35, p)
			});`,
	`					time: now / 1000,
					wave,
					waveAmp: 0.03 + 0.05 * Math.sin(Math.PI * p),
					pool: 0
				}
			);`
);
fs.writeFileSync(f, s);
