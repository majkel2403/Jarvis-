'use strict';
/* =========================================================
   JARVIS OS — Silnik efektów — screen (7)
   GENEROWANE z zrodla/effects/library/screen.ts przez tools/fx-port.mjs — nie edytuj ręcznie.
   Regeneracja: node tools/fx-port.mjs
   ========================================================= */
/* id: screen.flash, screen.vignette, screen.glitch, click.ripple, panel.sweep, ambient.flare, ambient.meteors */
(() => {
J.fxEngineLib = J.fxEngineLib || [];
const { ACCENTS, PALETTE } = J.fxTokens;
const { atLeast } = J.fxQuality;
const { canAnimate, later, spawn, track, viewportCenter } = J.fxDom;
/** A soft radial bloom over the whole screen, centred on the orb. */
const screenFlash = {
    id: "screen.flash",
    minQuality: "low",
    durationMs: 900,
    start({ targets, params, quality }) {
        const layer = targets.get("screen-fx");
        const orb = targets.get("orb");
        if (!layer)
            return;
        const { x, y } = orb ? viewportCenter(orb) : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        const color = String(params.color ?? "rgb(125 211 252 / 0.32)");
        const flash = spawn(layer, {
            inset: "0",
            background: `radial-gradient(circle at ${x}px ${y}px, ${color} 0%, transparent 55%)`,
        });
        const peak = atLeast(quality, "high") ? 1 : 0.6;
        return track([flash.animate([{ opacity: 0 }, { opacity: peak, offset: 0.18 }, { opacity: 0 }], { duration: 850, easing: "ease-out", fill: "forwards" })], [flash]);
    },
};
/** Red edge glow for failures. */
const screenVignette = {
    id: "screen.vignette",
    minQuality: "low",
    durationMs: 1400,
    start({ targets }) {
        const layer = targets.get("screen-fx");
        if (!layer)
            return;
        const v = spawn(layer, {
            inset: "0",
            boxShadow: `inset 0 0 160px 40px ${PALETTE.danger}66`,
        });
        return track([v.animate([{ opacity: 0 }, { opacity: 1, offset: 0.12 }, { opacity: 0.6, offset: 0.4 }, { opacity: 0 }], { duration: 1300, fill: "forwards" })], [v]);
    },
};
/** RGB-split shake of the whole desktop on failure. */
const screenGlitch = {
    id: "screen.glitch",
    minQuality: "high",
    target: () => "stage",
    priority: 3,
    durationMs: 600,
    start({ targets }) {
        const stage = targets.get("stage");
        if (!canAnimate(stage))
            return;
        const red = `drop-shadow(3px 0 0 ${PALETTE.danger}aa) drop-shadow(-3px 0 0 ${ACCENTS.cyan.hex}aa)`;
        return track([
            stage.animate([
                { transform: "translate(0,0)", filter: "none" },
                { transform: "translate(-6px, 1px) skewX(-1.5deg)", filter: red, offset: 0.1 },
                { transform: "translate(5px, -2px)", filter: "none", offset: 0.2 },
                { transform: "translate(-3px, 2px) skewX(1deg)", filter: red, offset: 0.32 },
                { transform: "translate(2px, 0)", filter: "none", offset: 0.5 },
                { transform: "translate(-1px, 0)", filter: red, offset: 0.65 },
                { transform: "translate(0,0)", filter: "none" },
            ], { duration: 560, easing: "steps(1, end)" }),
        ]);
    },
};
/** Ripple (and a few sparks at high quality) wherever the user clicks. */
const clickRipple = {
    id: "click.ripple",
    minQuality: "low",
    durationMs: 700,
    start({ targets, params, quality }) {
        const layer = targets.get("screen-fx");
        if (!layer)
            return;
        const x = Number(params.x);
        const y = Number(params.y);
        const spawned = [];
        const anims = [];
        const ring = spawn(layer, {
            left: `${x - 22}px`,
            top: `${y - 22}px`,
            width: "44px",
            height: "44px",
            borderRadius: "9999px",
            border: `1.5px solid ${ACCENTS.cyan.soft}`,
            boxShadow: `0 0 14px ${ACCENTS.cyan.soft}`,
        });
        spawned.push(ring);
        anims.push(ring.animate([
            { transform: "scale(0.2)", opacity: 0.9 },
            { transform: "scale(1.4)", opacity: 0 },
        ], { duration: 550, easing: "cubic-bezier(.1,.7,.3,1)", fill: "forwards" }));
        if (atLeast(quality, "high")) {
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2 + Math.random();
                const dot = spawn(layer, {
                    left: `${x - 1.5}px`,
                    top: `${y - 1.5}px`,
                    width: "3px",
                    height: "3px",
                    borderRadius: "9999px",
                    background: "#e0f2fe",
                    boxShadow: `0 0 6px ${ACCENTS.blue.soft}`,
                });
                spawned.push(dot);
                anims.push(dot.animate([
                    { transform: "translate(0,0)", opacity: 1 },
                    { transform: `translate(${Math.cos(angle) * 30}px, ${Math.sin(angle) * 30}px)`, opacity: 0 },
                ], { duration: 500, easing: "ease-out", fill: "forwards" }));
            }
        }
        return track(anims, spawned);
    },
};
/** A holographic light sweep over a panel as it opens or receives a message. */
const panelSweep = {
    id: "panel.sweep",
    minQuality: "high",
    durationMs: 1200,
    start({ targets, params }) {
        const key = params.panel === "chat" ? "panel:chat" : params.panel === "log" ? "panel:log" : "panel:widget";
        // The widget panel mounts after the previous one finishes its exit animation.
        return later(params.panel === "widget" || !params.panel ? 260 : 0, () => {
            const panel = targets.get(key);
            if (!panel)
                return;
            const bar = spawn(panel, {
                top: "0",
                bottom: "0",
                left: "0",
                width: "60%",
                zIndex: "5",
                background: "linear-gradient(100deg, transparent, rgb(125 211 252 / 0.16), rgb(255 255 255 / 0.22), transparent)",
            });
            const edge = spawn(panel, {
                left: "0",
                right: "0",
                top: "0",
                height: "2px",
                zIndex: "5",
                background: `linear-gradient(90deg, transparent, ${ACCENTS.cyan.soft}, transparent)`,
            });
            return track([
                bar.animate([{ transform: "translateX(-120%)" }, { transform: "translateX(220%)" }], {
                    duration: 850,
                    easing: "cubic-bezier(.4,0,.2,1)",
                    fill: "forwards",
                }),
                edge.animate([{ transform: "translateY(0)", opacity: 1 }, { transform: `translateY(${panel.clientHeight}px)`, opacity: 0 }], {
                    duration: 700,
                    easing: "ease-in",
                    fill: "forwards",
                }),
            ], [bar, edge]);
        });
    },
};
const ambientFlare = {
    id: "ambient.flare",
    minQuality: "high",
    start({ targets, params }) {
        targets.get("ambient")?.flare(params.color);
    },
};
/** A small meteor shower to celebrate a finished task. */
const ambientMeteors = {
    id: "ambient.meteors",
    minQuality: "high",
    durationMs: 1200,
    start({ targets, quality }) {
        const ambient = targets.get("ambient");
        if (!ambient)
            return;
        const count = quality === "ultra" ? 4 : 2;
        const timers = Array.from({ length: count }, (_, i) => setTimeout(() => ambient.meteor(), i * 260));
        return { stop: () => timers.forEach(clearTimeout) };
    },
};
J.fxEngineLib.push(screenFlash, screenVignette, screenGlitch, clickRipple, panelSweep, ambientFlare, ambientMeteors);
})();