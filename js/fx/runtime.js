'use strict';
/* =========================================================
   JARVIS OS — Runtime efektów sygnaturowych (FxCtx, oś czasu, sprzątanie)
   GENEROWANE z katalog/01-signature-fx/_runtime/runtime.ts przez tools/fx-port.mjs — nie edytuj ręcznie.
   Regeneracja: node tools/fx-port.mjs
   ========================================================= */
(() => {
const { PALETTES } = J.fxPal;
const ease = {
    outCubic: (t) => 1 - Math.pow(1 - t, 3),
    inCubic: (t) => t * t * t,
    inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    inExpo: (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
    outBack: (t) => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2),
    outElastic: (t) => t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1,
};
/** 0 → 1 → 0 envelope with attack/release fractions. */
function envelope(t, attack = 0.15, release = 0.3) {
    if (t < attack)
        return ease.outCubic(t / attack);
    if (t > 1 - release)
        return ease.inOutCubic((1 - t) / release);
    return 1;
}
function clamp(v, lo = 0, hi = 1) {
    return Math.max(lo, Math.min(hi, v));
}
/** Progress of `t` within [a, b], clamped. */
function seg(t, a, b) {
    return clamp((t - a) / (b - a));
}
const PERM = new Uint8Array(512);
{
    const p = Array.from({ length: 256 }, (_, i) => i);
    let s = 1337;
    for (let i = 255; i > 0; i--) {
        s = (s * 16807) % 2147483647;
        const j = s % (i + 1);
        [p[i], p[j]] = [p[j], p[i]];
    }
    for (let i = 0; i < 512; i++)
        PERM[i] = p[i & 255];
}
function grad(h, x, y) {
    const g = h & 7;
    const u = g < 4 ? x : y;
    const v = g < 4 ? y : x;
    return ((g & 1) ? -u : u) + ((g & 2) ? -2 * v : 2 * v);
}
/** Classic 2D Perlin noise, range ≈ [-1, 1]. */
function noise2(x, y) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10);
    const v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
    const aa = PERM[PERM[X] + Y];
    const ab = PERM[PERM[X] + Y + 1];
    const ba = PERM[PERM[X + 1] + Y];
    const bb = PERM[PERM[X + 1] + Y + 1];
    const x1 = grad(aa, xf, yf) + u * (grad(ba, xf - 1, yf) - grad(aa, xf, yf));
    const x2 = grad(ab, xf, yf - 1) + u * (grad(bb, xf - 1, yf - 1) - grad(ab, xf, yf - 1));
    return (x1 + v * (x2 - x1)) * 0.35;
}
const GL_VERTEX = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;
const GL_HEADER = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uDpr;
uniform float uTime;
uniform float uT;
uniform float uI;
uniform vec3 uOrb;
uniform vec3 uA;
uniform vec3 uB;
uniform vec3 uC;
uniform vec2 uPtr;
out vec4 outColor;
vec2 px() { return vec2(gl_FragCoord.x, uRes.y * uDpr - gl_FragCoord.y) / uDpr; }
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) { float v = 0.0; float a = 0.5; for (int i = 0; i < 5; i++) { v += a * vnoise(p); p *= 2.03; a *= 0.5; } return v; }
`;
function hex3(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
/** Runs one signature effect on the OS FX layer. Returns a stop function. */
function runSignature(env, fx, opts = {}, onEnd) {
    const layer = env.layer;
    const W = Math.max(1, layer.clientWidth);
    const H = Math.max(1, layer.clientHeight);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const lite = env.quality === "low";
    const intensity = Math.max(0.4, Math.min(1.8, opts.intensity ?? 1));
    const pal = PALETTES[opts.palette ?? "arc"];
    const anchors = env.anchors();
    const speed = Math.max(0.05, Math.min(4, opts.speed ?? 1));
    const root = document.createElement("div");
    root.style.cssText = "position:absolute;inset:0;pointer-events:none;overflow:hidden;contain:strict;";
    root.dataset.fx = fx.id;
    layer.appendChild(root);
    const cleanups = [];
    const frames = [];
    const timers = [];
    const anims = [];
    let raf = 0;
    let done = false;
    const start = performance.now();
    let last = start;
    let elapsed = 0;
    const ctx = {
        W,
        H,
        dpr,
        quality: env.quality,
        lite,
        intensity,
        pal,
        text: opts.text,
        anchors,
        root,
        durationMs: fx.durationMs,
        n: (base) => Math.max(1, Math.round(base * intensity * (lite ? 0.45 : 1))),
        canvas: ({ blend = "lighter", css = "" } = {}) => {
            const c = document.createElement("canvas");
            c.width = Math.round(W * dpr);
            c.height = Math.round(H * dpr);
            c.style.cssText = `position:absolute;inset:0;width:100%;height:100%;${css}`;
            root.appendChild(c);
            const g = c.getContext("2d");
            g.setTransform(dpr, 0, 0, dpr, 0, 0);
            g.globalCompositeOperation = blend;
            return g;
        },
        gl: (frag, css = "mix-blend-mode:screen;") => {
            if (lite)
                return null;
            const c = document.createElement("canvas");
            const scale = Math.min(dpr, 1.25);
            c.width = Math.round(W * scale);
            c.height = Math.round(H * scale);
            c.style.cssText = `position:absolute;inset:0;width:100%;height:100%;${css}`;
            const gl = c.getContext("webgl2", { premultipliedAlpha: true, alpha: true, antialias: false });
            if (!gl)
                return null;
            const compile = (type, src) => {
                const s = gl.createShader(type);
                gl.shaderSource(s, src);
                gl.compileShader(s);
                if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
                    console.warn(`[fx:${fx.id}]`, gl.getShaderInfoLog(s));
                    return null;
                }
                return s;
            };
            const vs = compile(gl.VERTEX_SHADER, GL_VERTEX);
            const fs = compile(gl.FRAGMENT_SHADER, GL_HEADER + frag);
            if (!vs || !fs)
                return null;
            const prog = gl.createProgram();
            gl.attachShader(prog, vs);
            gl.attachShader(prog, fs);
            gl.linkProgram(prog);
            if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
                return null;
            root.appendChild(c);
            const buf = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, buf);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
            const loc = gl.getAttribLocation(prog, "aPos");
            gl.enableVertexAttribArray(loc);
            gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
            gl.useProgram(prog);
            gl.viewport(0, 0, c.width, c.height);
            const u = (name) => gl.getUniformLocation(prog, name);
            gl.uniform2f(u("uRes"), W, H);
            gl.uniform1f(u("uDpr"), scale);
            gl.uniform1f(u("uI"), intensity);
            gl.uniform3f(u("uOrb"), anchors.orb.x, anchors.orb.y, anchors.orb.r);
            gl.uniform3fv(u("uA"), hex3(pal.a));
            gl.uniform3fv(u("uB"), hex3(pal.b));
            gl.uniform3fv(u("uC"), hex3(pal.c));
            cleanups.push(() => gl.getExtension("WEBGL_lose_context")?.loseContext());
            return {
                draw: (extra = {}) => {
                    gl.uniform1f(u("uTime"), elapsed / 1000);
                    gl.uniform1f(u("uT"), Math.min(1, elapsed / fx.durationMs));
                    gl.uniform2f(u("uPtr"), anchors.pointer.x, anchors.pointer.y);
                    for (const [k, v] of Object.entries(extra)) {
                        const l = u(k);
                        if (!l)
                            continue;
                        if (typeof v === "number")
                            gl.uniform1f(l, v);
                        else if (v.length === 2)
                            gl.uniform2fv(l, v);
                        else if (v.length === 3)
                            gl.uniform3fv(l, v);
                        else
                            gl.uniform4fv(l, v);
                    }
                    gl.clearColor(0, 0, 0, 0);
                    gl.clear(gl.COLOR_BUFFER_BIT);
                    gl.drawArrays(gl.TRIANGLES, 0, 3);
                },
            };
        },
        el: (tag, css, text, parent) => {
            const n = document.createElement(tag);
            n.style.cssText = css;
            if (text != null)
                n.textContent = text;
            (parent ?? root).appendChild(n);
            return n;
        },
        svg: (css = "", parent) => {
            const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            s.setAttribute("viewBox", `0 0 ${W} ${H}`);
            s.setAttribute("width", String(W));
            s.setAttribute("height", String(H));
            s.style.cssText = `position:absolute;inset:0;overflow:visible;${css}`;
            (parent ?? root).appendChild(s);
            return s;
        },
        svgEl: (tag, attrs, parent) => {
            const n = document.createElementNS("http://www.w3.org/2000/svg", tag);
            for (const [k, v] of Object.entries(attrs))
                n.setAttribute(k, String(v));
            parent.appendChild(n);
            return n;
        },
        loop: (fn) => frames.push(fn),
        after: (ms, fn) => timers.push(window.setTimeout(() => !done && fn(), ms / speed)),
        onCleanup: (fn) => cleanups.push(fn),
        onPointer: (fn) => cleanups.push(env.subscribePointer(fn)),
        track: (a) => {
            a.playbackRate = speed;
            anims.push(a);
            return a;
        },
        shake: (px, ms, delay = 0) => {
            const k = [];
            const steps = Math.max(4, Math.round(ms / 40));
            for (let i = 0; i <= steps; i++) {
                const f = 1 - i / steps;
                const a = i === steps ? 0 : px * f;
                k.push({ transform: `translate(${(Math.random() * 2 - 1) * a}px, ${(Math.random() * 2 - 1) * a}px)` });
            }
            for (const elx of env.scene())
                ctx.track(elx.animate(k, { duration: ms, delay, composite: "add" }));
        },
        scene: (keyframes, o, originAt) => {
            const at = originAt ?? { x: W / 2, y: H / 2 };
            const lr = layer.getBoundingClientRect();
            for (const elx of env.scene()) {
                const r = elx.getBoundingClientRect();
                const prev = elx.style.transformOrigin;
                elx.style.transformOrigin = `${lr.left + at.x - r.left}px ${lr.top + at.y - r.top}px`;
                ctx.track(elx.animate(keyframes, o));
                cleanups.push(() => {
                    elx.style.transformOrigin = prev;
                });
            }
        },
        sceneEls: env.scene,
        element: env.element,
        rand: (a = 1, b) => (b == null ? Math.random() * a : a + Math.random() * (b - a)),
        pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
    };
    const stop = () => {
        if (done)
            return;
        done = true;
        cancelAnimationFrame(raf);
        timers.forEach(clearTimeout);
        anims.forEach((a) => a.cancel());
        for (const c of cleanups.splice(0)) {
            try {
                c();
            }
            catch { }
        }
        root.remove();
        onEnd?.();
    };
    try {
        fx.run(ctx);
    }
    catch (err) {
        console.error(`[fx:${fx.id}]`, err);
        stop();
        return stop;
    }
    const tick = (now) => {
        if (done)
            return;
        // Timeline follows wall time so low-fps devices keep the real duration; physics dt is bounded so integrators stay stable.
        const step = Math.min(1000, now - last) * speed;
        const dt = Math.min(100, step) / 16.667;
        elapsed += step;
        last = now;
        const ms = elapsed;
        const t = Math.min(1, ms / fx.durationMs);
        for (const f of frames)
            f(t, ms, dt);
        if (t >= 1) {
            const fade = root.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: "forwards" });
            fade.onfinish = stop;
            timers.push(window.setTimeout(stop, 400));
            return;
        }
        raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return stop;
}
J.fxRt = { clamp, ease, envelope, noise2, runSignature, seg };
})();
