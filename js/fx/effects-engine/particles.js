'use strict';
/* =========================================================
   JARVIS OS — Silnik efektów — particles (4)
   GENEROWANE z zrodla/effects/library/particles.ts przez tools/fx-port.mjs — nie edytuj ręcznie.
   Regeneracja: node tools/fx-port.mjs
   ========================================================= */
/* id: orb.inhale, orb.shockwave, orb.ping, holo.confetti */
(() => {
J.fxEngineLib = J.fxEngineLib || [];
const { ACCENTS } = J.fxTokens;
const { atLeast } = J.fxQuality;
const { canAnimate, centerWithin, spawn, track } = J.fxDom;
const SHARD_COLORS = [ACCENTS.blue.soft, ACCENTS.cyan.soft, ACCENTS.purple.soft, "#f0abfc", "#e0f2fe"];
/** Motes of light streaming into the orb as a run starts. */
const orbInhale = {
    id: "orb.inhale",
    minQuality: "high",
    durationMs: 1000,
    start({ targets, quality }) {
        const layer = targets.get("fx-layer");
        const orb = targets.get("orb");
        targets.get("webgl-orb")?.inhale();
        if (!layer || !orb)
            return;
        const { x, y, size } = centerWithin(orb, layer);
        const count = quality === "ultra" ? 34 : 20;
        const spawned = [];
        const anims = [];
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = size * (0.9 + Math.random() * 0.9);
            const s = 2 + Math.random() * 3;
            const color = SHARD_COLORS[i % SHARD_COLORS.length];
            const dot = spawn(layer, {
                left: `${x - s / 2}px`,
                top: `${y - s / 2}px`,
                width: `${s}px`,
                height: `${s}px`,
                borderRadius: "9999px",
                background: color,
                boxShadow: `0 0 8px ${color}`,
            });
            spawned.push(dot);
            anims.push(dot.animate([
                { transform: `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px) scale(1.4)`, opacity: 0 },
                { opacity: 1, offset: 0.3 },
                { transform: "translate(0,0) scale(0.2)", opacity: 0 },
            ], { duration: 650 + Math.random() * 300, delay: Math.random() * 120, easing: "cubic-bezier(.55,0,.8,.4)", fill: "both" }));
        }
        return track(anims, spawned);
    },
};
/** Two concentric charge rings pushed out from the orb. */
const orbShockwave = {
    id: "orb.shockwave",
    minQuality: "low",
    durationMs: 1400,
    start({ targets, quality }) {
        const layer = targets.get("fx-layer");
        const orb = targets.get("orb");
        if (!layer || !orb)
            return;
        const { x, y, size } = centerWithin(orb, layer);
        const rings = atLeast(quality, "high") ? [0, 220] : [0];
        const spawned = [];
        const anims = rings.map((delay, i) => {
            const color = i === 0 ? ACCENTS.purple.soft : ACCENTS.cyan.soft;
            const ring = spawn(layer, {
                left: `${x - size / 2}px`,
                top: `${y - size / 2}px`,
                width: `${size}px`,
                height: `${size}px`,
                borderRadius: "9999px",
                border: `1.5px solid ${color}`,
                boxShadow: `0 0 18px ${color}`,
            });
            spawned.push(ring);
            return ring.animate([
                { transform: "scale(0.55)", opacity: 0 },
                { transform: "scale(0.75)", opacity: 0.9, offset: 0.15 },
                { transform: "scale(1.9)", opacity: 0 },
            ], { duration: 1100, delay, easing: "cubic-bezier(.15,.7,.3,1)", fill: "both" });
        });
        return track(anims, spawned);
    },
};
/** A faint ring on every keystroke, so the orb visibly "listens". */
const orbPing = {
    id: "orb.ping",
    minQuality: "high",
    throttleMs: 110,
    durationMs: 650,
    start({ targets }) {
        const layer = targets.get("fx-layer");
        const orb = targets.get("orb");
        if (!layer || !canAnimate(orb))
            return;
        const { x, y, size } = centerWithin(orb, layer);
        const s = size * 0.62;
        const ring = spawn(layer, {
            left: `${x - s / 2}px`,
            top: `${y - s / 2}px`,
            width: `${s}px`,
            height: `${s}px`,
            borderRadius: "9999px",
            border: `1px solid ${ACCENTS.cyan.soft}`,
        });
        return track([
            ring.animate([
                { transform: "scale(0.9)", opacity: 0.7 },
                { transform: "scale(1.35)", opacity: 0 },
            ], { duration: 600, easing: "ease-out", fill: "forwards" }),
        ], [ring]);
    },
};
/** Holographic shards thrown up from the orb on success, falling under gravity. */
const holoConfetti = {
    id: "holo.confetti",
    minQuality: "ultra",
    durationMs: 2300,
    start({ targets }) {
        const layer = targets.get("fx-layer");
        const orb = targets.get("orb");
        if (!layer || !orb)
            return;
        const { x, y, size } = centerWithin(orb, layer);
        const spawned = [];
        const anims = [];
        for (let i = 0; i < 42; i++) {
            const color = SHARD_COLORS[i % SHARD_COLORS.length];
            const w = 3 + Math.random() * 5;
            const h = w * (1.6 + Math.random());
            const shard = spawn(layer, {
                left: `${x - w / 2}px`,
                top: `${y - h / 2}px`,
                width: `${w}px`,
                height: `${h}px`,
                borderRadius: "1px",
                background: `linear-gradient(135deg, ${color}, rgba(255,255,255,0.85))`,
                boxShadow: `0 0 6px ${color}`,
            });
            spawned.push(shard);
            const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1;
            const v = size * (0.9 + Math.random() * 0.9);
            const dx = Math.cos(angle) * v;
            const dy = Math.sin(angle) * v;
            const fall = size * (1.1 + Math.random() * 0.6);
            const spin = (Math.random() - 0.5) * 1080;
            const frames = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
                offset: t,
                transform: `translate(${dx * t}px, ${dy * t + fall * t * t}px) rotate(${spin * t}deg) rotateX(${t * 720}deg)`,
                opacity: t < 0.75 ? 1 : 1 - (t - 0.75) * 4,
            }));
            anims.push(shard.animate(frames, { duration: 1700 + Math.random() * 500, easing: "cubic-bezier(.2,.6,.4,1)", fill: "forwards" }));
        }
        return track(anims, spawned);
    },
};
J.fxEngineLib.push(orbInhale, orbShockwave, orbPing, holoConfetti);
})();