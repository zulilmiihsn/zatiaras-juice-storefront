import{D as e,F as t,G as n,H as r,K as i,Q as a,T as o,U as s,V as c,Y as l,a as u,at as d,dt as f,et as p,g as m,h,k as g,l as _,o as v,ot as y,q as b,r as x,tt as S,ut as C,y as ee}from"../chunks/wHb_Yi3m.js";import"../chunks/xihTtKlq.js";function w(e,t,n,r,i){let a=Number.isFinite(e)?Math.max(2,Math.min(32768,e)):2,o=Number.isFinite(t)?Math.max(2,Math.min(32768,t)):2,s=Number.isFinite(n)?Math.max(1,Math.min(1.5,n)):1,c=Number.isFinite(r)?Math.max(.4,Math.min(1,r)):1,l=Math.min(s,Math.sqrt((i?45e4:9e5)/(a*o)))*c;return{width:Math.max(2,Math.floor(a*l)),height:Math.max(2,Math.floor(o*l))}}var T=`#version 300 es
precision highp float;
layout(location = 0) in vec2 aUv;
uniform vec2 uRes, uPrincipal, uLean;
uniform vec3 uCam, uRight, uUp, uFwd, uPtr;
uniform float uFocal, uTime, uH, uFlare, uLag, uLevel, uRingR, uRingA, uSpan;
out vec3 vWorld, vNormal;
const float PI = 3.14159265;

float crest(float x) {
	float drift = 0.16 * sin(uTime * 0.4);
	float a = x - 0.95 - drift;
	float b = x - 3.05 + drift * 0.7;
	float shoulder = x - 1.8;
	float lobes = 0.65 * exp(-a*a / 0.8) + 1.35 * exp(-b*b / 1.3);
	return -1.02 + 0.3 * sin(x * 0.65 - 0.7 + uTime * 0.2)
		+ 0.35 * exp(-shoulder * shoulder / 5.0) + uH * (0.2 + lobes);
}

vec3 surface(vec2 uv) {
	float x = uv.x * uSpan;
	float top = crest(x);
	// Concentrate rows on the visible shoulder and roll, rather than far below it.
	float t = clamp(uv.y / 0.84, 0.0, 1.0);
	float y = mix(-10.0, top, 1.0 - pow(1.0 - t, 1.4));
	float depth = top - y;
	float z = 1.65 * (1.0 - exp(-depth * depth * 1.1)) - 0.08 * depth;
	float fold = exp(-pow((depth - 0.75) / 1.15, 2.0)) * smoothstep(0.0, 0.4, depth);
	float shoulder = -0.8 + 0.32 * sin(x * 0.8 - 0.4 + uTime * 0.22);
	z += 0.48 * exp(-pow((y - shoulder + 0.45) / 0.72, 2.0)) * smoothstep(0.0, 0.4, depth);
	z += fold * 0.13 * sin(x * 0.65 + depth * 0.8 - uTime * 0.4);
	z += uRingA * 0.14 * sin(y * 0.7 + x * 0.3 - uRingR * 0.4) * smoothstep(0.0, 0.4, depth);
	z += uFlare * max(y + 0.5, 0.0) * max(y + 0.5, 0.0) * 0.22;
	if (uv.y > 0.84) {
		float angle = (uv.y - 0.84) / 0.16 * PI;
		float radius = 0.17 + 0.025 * sin(x * 1.2 + uTime * 0.3);
		y += radius * sin(angle);
		z -= radius * (1.0 - cos(angle));
	}
	float lift = max(y + 0.65, 0.0);
	x += (uLean.x + 0.055 * sin(x * 0.6 + 0.9)) * lift * lift;
	z += uLean.y * lift * lift;
	y += uLag * lift;
	vec2 delta = vec2(x, z) - uPtr.xy;
	float distance = length(delta);
	z += uPtr.z * 0.16 * sin(distance * 8.0 - uTime * 5.0) * exp(-distance * 1.5) * fold;
	return vec3(x, y + uLevel, z);
}

void main() {
	if (uLevel > 6.6) {
		gl_Position = vec4(aUv.x, aUv.y * 2.0 - 1.0, 0.0, 1.0);
		vWorld = vec3(0.0); vNormal = vec3(0.0, 0.0, 1.0);
		return;
	}
	vec3 p = surface(aUv);
	vec3 dx = surface(aUv + vec2(0.0005, 0.0)) - surface(aUv - vec2(0.0005, 0.0));
	vec3 dy = surface(aUv + vec2(0.0, 0.0005)) - surface(aUv - vec2(0.0, 0.0005));
	vec3 n = normalize(cross(dx, dy));
	vWorld = p; vNormal = n;
	vec3 delta = p - uCam;
	float depth = dot(delta, uFwd);
	vec2 center = 2.0 * uPrincipal / uRes - 1.0;
	vec2 projected = 2.0 * uFocal * vec2(dot(delta, uRight) * uRes.y / uRes.x, dot(delta, uUp));
	gl_Position = vec4(center * depth + projected, 1.002503 * depth - 0.20025, depth);
}`,E=`#version 300 es
precision highp float;
in vec3 vWorld, vNormal;
uniform vec3 uCam;
uniform float uLevel;
out vec4 outColor;
const vec3 PINK = vec3(1.0, 0.0627451, 0.5058824);

float panel(vec3 ray, vec3 direction, vec2 extent) {
	float facing = dot(ray, direction);
	if (facing <= 0.0) return 0.0;
	vec3 right = normalize(cross(direction, vec3(0.0, 1.0, 0.0)));
	vec3 up = cross(right, direction);
	vec2 uv = vec2(dot(ray, right), dot(ray, up)) / facing;
	vec2 scaled = uv / extent;
	return exp(-dot(scaled, scaled) * 1.5);
}

vec3 studio(vec3 ray) {
	vec3 light = vec3(0.25, 0.18, 0.14);
	light += 12.0 * panel(ray, normalize(vec3(-0.45, 0.7, 0.55)), vec2(0.55, 0.75));
	light += 9.0 * panel(ray, normalize(vec3(0.1, 0.45, 0.9)), vec2(0.1, 0.8));
	light += 7.0 * panel(ray, normalize(vec3(0.8, 0.25, 0.55)), vec2(0.075, 0.7));
	light += 2.5 * panel(ray, normalize(vec3(-0.2, -0.35, 0.9)), vec2(0.6, 0.09));
	return light;
}

vec3 tonemap(vec3 color) {
	return clamp((color * (2.51 * color + 0.03)) / (color * (2.43 * color + 0.59) + 0.14), 0.0, 1.0);
}
void main() {
	if (uLevel > 6.6) { outColor = vec4(PINK, 1.0); return; }
	vec3 n = normalize(vNormal);
	if (!gl_FrontFacing) n = -n;
	vec3 view = normalize(uCam - vWorld);
	vec3 light = normalize(vec3(-0.45, 0.7, 0.55));
	float diffuse = max(dot(n, light), 0.0);
	float fresnel = 0.028 + 0.972 * pow(1.0 - max(dot(n, view), 0.0), 5.0);
	vec3 reflection = reflect(-view, n);
	// Colors are authored in display space. A bounded pink shadow preserves the
	// supplied reference's bright hue instead of a dark red HDR/tone-map result.
	// Lighting is evaluated in linear space, then returned to display space.
	vec3 dye = pow(vec3(1.0, 0.035, 0.4), vec3(2.2));
	vec3 transmitted = dye * (0.3 + 0.8 * diffuse);
	vec3 lit = transmitted * (1.0 - fresnel) + studio(reflection) * fresnel;
	vec3 color = pow(tonemap(lit * 1.4), vec3(1.0 / 2.2));
	color = max(color, vec3(0.74, 0.015, 0.33));
	color = mix(color, PINK, smoothstep(5.1, 6.6, uLevel));
	outColor = vec4(color, 1.0);
}`;function D(e,t,n){let r=e.createShader(t);if(!r)throw Error(`createShader failed`);if(e.shaderSource(r,n),e.compileShader(r),!e.getShaderParameter(r,e.COMPILE_STATUS)){let t=e.getShaderInfoLog(r)||`shader compile failed`;throw e.deleteShader(r),Error(t)}return r}function O(e){let t=e.createProgram();if(!t)throw Error(`createProgram failed`);let n=[];try{n.push(D(e,e.VERTEX_SHADER,T)),n.push(D(e,e.FRAGMENT_SHADER,E));for(let r of n)e.attachShader(t,r);if(e.linkProgram(t),!e.getProgramParameter(t,e.LINK_STATUS))throw Error(e.getProgramInfoLog(t)||`program link failed`);return t}catch(n){throw e.deleteProgram(t),n}finally{for(let t of n)e.deleteShader(t)}}function k(e,t,n){let r=new Float32Array((t+1)*(n+1)*2),i=new Uint16Array(t*n*6);for(let e=0;e<=n;e++)for(let i=0;i<=t;i++){let a=(e*(t+1)+i)*2;r[a]=i/t*2-1,r[a+1]=e/n}let a=0;for(let e=0;e<n;e++)for(let n=0;n<t;n++){let r=e*(t+1)+n;i.set([r,r+1,r+t+1,r+1,r+t+2,r+t+1],a),a+=6}let o=e.createVertexArray(),s=e.createBuffer(),c=e.createBuffer();if(!o||!s||!c)throw e.deleteVertexArray(o),e.deleteBuffer(s),e.deleteBuffer(c),Error(`mesh allocation failed`);return e.bindVertexArray(o),e.bindBuffer(e.ARRAY_BUFFER,s),e.bufferData(e.ARRAY_BUFFER,r,e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0),e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,c),e.bufferData(e.ELEMENT_ARRAY_BUFFER,i,e.STATIC_DRAW),{vao:o,vertex:s,index:c,count:i.length}}var A=[`uRes`,`uPrincipal`,`uFocal`,`uCam`,`uRight`,`uUp`,`uFwd`,`uTime`,`uH`,`uFlare`,`uLag`,`uLean`,`uLevel`,`uRingR`,`uRingA`,`uPtr`,`uSpan`],te=class e{gl;prog;uniforms;sheet;constructor(e,t,n){this.gl=e,this.prog=t,this.uniforms=Object.fromEntries(A.map(n=>[n,e.getUniformLocation(t,n)])),this.sheet=k(e,n?160:288,n?56:72),e.enable(e.DEPTH_TEST)}static create(t,n){let r=null;try{return r=t.getContext(`webgl2`,{alpha:!0,premultipliedAlpha:!0,antialias:!0,depth:!0,stencil:!1,powerPreference:`low-power`}),r?new e(r,O(r),n):null}catch(e){return r?.getExtension(`WEBGL_lose_context`)?.loseContext(),console.warn(`[liquid] shader unavailable`,e),null}}resize(e,t){let n=this.gl.canvas;(n.width!==e||n.height!==t)&&(n.width=e,n.height=t)}render(e){let{gl:t,uniforms:n}=this,{width:r,height:i}=t.canvas;t.viewport(0,0,r,i),t.clearColor(0,0,0,0),t.clear(t.COLOR_BUFFER_BIT|t.DEPTH_BUFFER_BIT),t.useProgram(this.prog),t.uniform2f(n.uRes,r,i),t.uniform2f(n.uPrincipal,...e.principal),t.uniform1f(n.uFocal,e.focal),t.uniform3f(n.uCam,...e.cam),t.uniform3f(n.uRight,...e.right),t.uniform3f(n.uUp,...e.up),t.uniform3f(n.uFwd,...e.fwd),t.uniform1f(n.uTime,e.time),t.uniform1f(n.uH,e.h),t.uniform1f(n.uFlare,e.flare),t.uniform1f(n.uLag,e.lag),t.uniform2f(n.uLean,...e.lean),t.uniform1f(n.uLevel,e.level),t.uniform1f(n.uRingR,e.ringR),t.uniform1f(n.uRingA,e.ringA),t.uniform3f(n.uPtr,...e.ptr),t.uniform1f(n.uSpan,Math.max(3.1,e.cam[2]/e.focal*r/i*.58+1.2)),t.bindVertexArray(this.sheet.vao),t.drawElements(t.TRIANGLES,this.sheet.count,t.UNSIGNED_SHORT,0)}dispose(){this.gl.deleteVertexArray(this.sheet.vao),this.gl.deleteBuffer(this.sheet.vertex),this.gl.deleteBuffer(this.sheet.index),this.gl.deleteProgram(this.prog),this.gl.getExtension(`WEBGL_lose_context`)?.loseContext()}},j=g(`<picture><source media="(max-aspect-ratio: 9/10)" srcset="/images/hero/wave-mobile.png"/> <img class="still svelte-kax6st" src="/images/hero/wave-desktop.png" alt="" width="1200" height="750" loading="eager" decoding="async"/></picture> <div class="fallback-cover svelte-kax6st"></div>`,1),ne=g(`<div aria-hidden="true"><canvas></canvas> <!></div>`);function M(n,c){y(c,!0);let g=u(c,`progress`,3,0),C=u(c,`anchorX`,3,.75),ee=u(c,`anchorY`,3,.86),T=u(c,`size`,3,.62),E=u(c,`class`,3,``),D=p(void 0),O=p(`pending`),k=(e,t)=>[e[0]-t[0],e[1]-t[1],e[2]-t[2]],A=(e,t)=>e[0]*t[0]+e[1]*t[1]+e[2]*t[2],M=(e,t)=>[e[1]*t[2]-e[2]*t[1],e[2]*t[0]-e[0]*t[2],e[0]*t[1]-e[1]*t[0]],N=e=>{let t=Math.hypot(e[0],e[1],e[2])||1;return[e[0]/t,e[1]/t,e[2]/t]},P=(e,t,n)=>{let r=Math.min(1,Math.max(0,(n-e)/(t-e)));return r*r*(3-2*r)},F=[0,2.2,7.8],I=N(k([0,1.25,0],F)),L=N(M(I,[0,1,0])),R=M(L,I),z=S(()=>Number.isFinite(g())?Math.min(1,Math.max(0,g())):0),B=S(()=>P(.48,.82,t(z)));s(()=>{t(O)!==`live`&&c.oncovered?.(t(B)>=1)}),x(()=>{if(!t(D))return;let e=navigator.connection,n=matchMedia(`(pointer: coarse)`).matches,r=matchMedia(`(prefers-reduced-motion: reduce)`),i=r.matches,o=e?.saveData||i?null:te.create(t(D),n);if(!o){a(O,`still`);return}a(O,`live`);let s=t(D),l=s.getBoundingClientRect(),u=.55,d=1,f=d,p=2,m=1.7,h=1,g=.6,_=1,v={x:-9,y:-9,vx:0,vy:0,active:!1,stamp:0},y=!0,b=0,x=performance.now(),S=0,E=0,j=!1,ne=t(z),M=t(z),B=0,V=0,H=0,U=0,W=0,G=[0,0],re=[0,0],K=[0,0,0],ie=-1,ae=0,oe=!1,q=0,J=()=>{l=s.getBoundingClientRect();let e=w(l.width,l.height,devicePixelRatio,f,n),t=e.width;p=e.height,o.resize(t,p);let r=l.width/Math.max(1,l.height),i=r<.9;_=i?r:Math.min(T()*1.9,r*.62),m=i?.84:T()/.62*1.25,h=r/2+(i?0:(C()-.75)*r);let a=k([0,0,1.85],F),c=A(a,R)/A(a,I)*m;g=(i?.81:ee()-.05)+c,ie=-1},Y=(e,t,n)=>{let r=Math.max(1,l.height),i=(e-l.left)/r,a=(t-l.top)/r,o=Math.max(8,n-(v.stamp||n-16))/1e3;v.active&&(v.vx=Math.max(-4,Math.min(4,(i-v.x)/o)),v.vy=Math.max(-4,Math.min(4,(a-v.y)/o))),v.x=i,v.y=a,v.active=!0,v.stamp=n},X=e=>Y(e.clientX,e.clientY,e.timeStamp),Z=e=>{i||!y||e.button>0||(X(e),v.y>.35&&v.y<1&&(W=Math.min(3,W+2.4)))},se=e=>{let t=e.touches[0];t&&Y(t.clientX,t.clientY,e.timeStamp)},Q=()=>{v.active=!1,v.vx=v.vy=0},ce=e=>{if(b=0,oe||!y||document.hidden)return;let n=e-x,r=1e3/(Math.abs(t(z)-M)>1e-4||e-v.stamp<350||Math.abs(W)>.08?60:30);if(n<r-.75){b=requestAnimationFrame(ce);return}if(x=e,q=n>100?q+1:Math.max(0,q-1),q>=8){le();return}let a=Math.min(.05,Math.max(.001,n/1e3));M+=(t(z)-M)*(1-Math.exp(-12*a)),Math.abs(t(z)-M)<1e-4&&(M=t(z));let s=M;if(i&&s===ie)return;ie=s,E++,n>r*1.8&&S++,E>=30&&(S>8&&f>u?(d=Math.max(u,f*.95),f=Math.max(u,f*.85),J()):S<3&&f<d&&(f=Math.min(d,f*1.1),J()),E=S=0);let l=i?0:Math.min(n,50)/1e3;ae+=l;let C=i?2:ae;B+=((s-ne)/a-B)*(1-Math.exp(-12*a)),ne=s,H+=(Math.max(-1.2,Math.min(1.2,B))*14-V*55)*l,H*=Math.exp(-3.2*l),V=Math.max(-.16,Math.min(.2,V+H*l)),W+=-U*30*l,W*=Math.exp(-2.6*l),U=Math.max(-.2,Math.min(.6,U+W*l));let ee=v.active&&Math.hypot(v.x-h,v.y-g)<_*.6?1:0,w=[.025*Math.sin(C*.7),.02*Math.sin(C*.53+1)];for(let e=0;e<2;e++){let t=(e===0?v.vx:v.vy*.6)*ee*.8;re[e]+=(t-(G[e]-w[e])*25)*l,re[e]*=Math.exp(-3*l),G[e]=Math.max(-.12,Math.min(.12,G[e]+re[e]*l))}let T=P(0,.32,s)*(1-P(.58,.88,s)),D=P(.65,.96,s),O=Math.max(.08,1.1*(1+.2*U+.3*T)*(1-.7*D)),k=.23+.09*T,A=.5+6.5*P(.15,1,s),te=.15+.85*T,Y=7.4*P(.08,1,s),X=0;if(v.active){let e=v.x-h,t=g-v.y,n=N([I[0]*m+L[0]*e+R[0]*t,I[1]*m+L[1]*e+R[1]*t,I[2]*m+L[2]*e+R[2]*t]);if(n[1]<-.001){let e=(Y-F[1])/n[1],t=F[0]+n[0]*e,r=F[2]+n[2]*e;Math.hypot(t,r)<26&&(K[0]=t,K[1]=r,X=.4+Math.min(.6,Math.hypot(v.vx,v.vy)*.3))}}K[2]+=(X-K[2])*(1-Math.exp(-4*Math.max(l,.016))),v.vx*=.85,v.vy*=.85,o.render({principal:[h*p,(1-g)*p],focal:m,cam:F,right:L,up:R,fwd:I,time:C,h:O,flare:k,lag:Math.max(-.35,V),lean:[G[0],G[1]],level:Y,ringR:A,ringA:te,ptr:K});let Z=Y>6.6;Z!==j&&(j=Z,c.oncovered?.(Z)),(!Z||M!==t(z))&&(b=requestAnimationFrame(ce))},$=()=>{!oe&&!b&&y&&!document.hidden&&(x=performance.now(),b=requestAnimationFrame(ce))},le=()=>{oe=!0,cancelAnimationFrame(b),b=0,a(O,`still`)},ue=e=>{e.preventDefault(),le()},de=()=>{r.matches&&le()},fe=new ResizeObserver(()=>{J(),$()});fe.observe(s);let pe=new IntersectionObserver(e=>{y=e.some(e=>e.isIntersecting),$()});pe.observe(s);let me=()=>{l=s.getBoundingClientRect(),$()};return J(),window.addEventListener(`pointermove`,X,{passive:!0}),window.addEventListener(`pointerdown`,Z,{passive:!0}),window.addEventListener(`touchmove`,se,{passive:!0}),window.addEventListener(`touchend`,Q,{passive:!0}),window.addEventListener(`pointercancel`,Q,{passive:!0}),window.addEventListener(`blur`,Q),document.documentElement.addEventListener(`pointerleave`,Q),window.addEventListener(`scroll`,me,{passive:!0}),document.addEventListener(`visibilitychange`,$),s.addEventListener(`webglcontextlost`,ue),r.addEventListener(`change`,de),$(),()=>{cancelAnimationFrame(b),fe.disconnect(),pe.disconnect(),window.removeEventListener(`pointermove`,X),window.removeEventListener(`pointerdown`,Z),window.removeEventListener(`touchmove`,se),window.removeEventListener(`touchend`,Q),window.removeEventListener(`pointercancel`,Q),window.removeEventListener(`blur`,Q),document.documentElement.removeEventListener(`pointerleave`,Q),window.removeEventListener(`scroll`,me),document.removeEventListener(`visibilitychange`,$),s.removeEventListener(`webglcontextlost`,ue),r.removeEventListener(`change`,de),o.dispose()}});var V=ne(),H=i(V);let U;v(H,e=>a(D,e),()=>t(D));var W=l(H,2),G=n=>{var i=j(),a=l(b(i),2);let o;r(()=>o=h(a,``,o,{opacity:t(B)})),e(n,i)};o(W,e=>{t(O)!==`live`&&e(G)}),f(V),r(()=>{m(V,1,`liquid-splash pointer-events-none ${E()??``}`,`svelte-kax6st`),_(V,`data-liquid-mode`,t(O)),U=m(H,1,`absolute inset-0 h-full w-full`,null,U,{invisible:t(O)!==`live`})}),e(n,V),d()}var N=g(`<meta name="robots" content="noindex,nofollow"/>`),P=g(`<div class="relative h-[250dvh]" data-liquid-track=""><section class="liquid-stage sticky top-0 min-h-[100dvh] overflow-hidden bg-[#FFF8EC] svelte-yqq98c" aria-label="Prototipe hero liquid"><!> <img class="cup absolute svelte-yqq98c" src="/images/assortment/avocado-960.webp" alt="Jus Alpukat Zatiaras" width="960" height="778"/> <div class="intro relative mx-auto max-w-6xl px-6 pt-20 sm:pt-24 lg:pt-28 svelte-yqq98c"><p class="mb-6 text-xs font-semibold tracking-[0.18em] text-ink/60 uppercase">Zatiaras Juice · Eksplorasi gerak</p> <h1 class="font-display text-[clamp(3.5rem,13vw,8rem)] leading-[0.9] font-extrabold text-brand">JUS<br/>ALPUKAT</h1> <p class="mt-6 max-w-64 text-sm leading-relaxed text-ink/70">Gulir perlahan. Sentuh atau gerakkan kursor di permukaan cairan.</p></div></section></div> <section class="flex min-h-[100dvh] items-center bg-brand px-6 text-white"><div class="mx-auto w-full max-w-6xl"><p class="mb-4 text-xs font-semibold tracking-[0.18em] uppercase">Zatiaras Juice</p> <h2 class="font-display text-5xl font-extrabold sm:text-7xl">Rasa buah.<br/>Sepenuh hati.</h2> <a href="/menu" class="mt-8 inline-flex min-h-12 items-center rounded-full bg-[#FFF8EC] px-6 font-semibold text-ink transition-transform duration-200 ease-out active:scale-[0.98]">Lihat menu</a></div></section>`,1);function F(o,s){y(s,!0);let u=p(void 0),m=p(0),g=p(!1);x(()=>{let e=()=>{if(!t(u))return;let e=t(u).getBoundingClientRect(),n=Math.max(1,e.height-innerHeight);a(m,Math.min(1,Math.max(0,-e.top/n)),!0)};return e(),addEventListener(`scroll`,e,{passive:!0}),addEventListener(`resize`,e),()=>{removeEventListener(`scroll`,e),removeEventListener(`resize`,e)}});var S=P();ee(`yqq98c`,t=>{var r=N();c(()=>{n.title=`Liquid prototype | Zatiaras Juice`}),e(t,r)});var w=b(S),T=i(w),E=i(T);M(E,{get progress(){return t(m)},oncovered:e=>a(g,e,!0),class:`wave`});var D=l(E,2),O=l(D,2);f(T),f(w),v(w,e=>a(u,e),()=>t(u)),C(2),r((e,n)=>{_(w,`data-covered`,t(g)),h(D,`opacity: ${e??``}`),h(O,`opacity: ${n??``}`)},[()=>1-Math.min(1,t(m)*4),()=>1-Math.min(1,t(m)*3.2)]),e(o,S),d()}export{F as component};