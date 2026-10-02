'use strict';
/* =========================================================
   JARVIS OS — Silnik efektów — orb (5)
   GENEROWANE z zrodla/effects/library/orb.ts przez tools/fx-port.mjs — nie edytuj ręcznie.
   Regeneracja: node tools/fx-port.mjs
   ========================================================= */
/* id: orb.charge, orb.burst, orb.error, orb.flicker, orb.energy */
(() => {
J.fxEngineLib = J.fxEngineLib || [];
const { ACCENTS, PALETTE } = J.fxTokens;
const { atLeast } = J.fxQuality;
const { canAnimate, centerWithin, spawn, track } = J.fxDom;
const orbCharge = {
    id: "orb.charge",
    minQuality: "low",
    target: () => "orb",
    priority: 1,
    durationMs: 700,
    start({ targets }) {
        const orb = targets.get("orb");
        if (!canAnimate(orb))
            return;
        return track([
            orb.animate([{ transform: "scale(1)" }, { transform: "scale(1.07)", offset: 0.35 }, { transform: "scale(1)" }], { duration: 700, easing: "cubic-bezier(.2,.8,.2,1)" }),
        ]);
    },
};
function burstRing(color, quality, layer, orb) {
    const { x, y, size } = centerWithin(orb, layer);
    const spawned = [];
    const anims = [];
    const ring = spawn(layer, {
        left: `${x - size / 2}px`,
        top: `${y - size / 2}px`,
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "9999px",
        border: `2px solid ${color}`,
        boxShadow: `0 0 24px ${color}, inset 0 0 24px ${color}`,
    });
    spawned.push(ring);
    anims.push(ring.animate([
        { transform: "scale(0.9)", opacity: 0.95 },
        { transform: "scale(2.3)", opacity: 0 },
    ], { duration: 1100, easing: "cubic-bezier(.1,.7,.3,1)", fill: "forwards" }));
    if (atLeast(quality, "high")) {
        const sparks = 14;
        for (let i = 0; i < sparks; i++) {
            const angle = (i / sparks) * Math.PI * 2;
            const dist = size * (0.75 + (i % 3) * 0.18);
            const dot = spawn(layer, {
                left: `${x - 3}px`,
                top: `${y - 3}px`,
                width: "6px",
                height: "6px",
                borderRadius: "9999px",
                background: color,
                boxShadow: `0 0 10px ${color}`,
            });
            spawned.push(dot);
            anims.push(dot.animate([
                { transform: "translate(0,0) scale(1)", opacity: 1 },
                { transform: `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px) scale(0.3)`, opacity: 0 },
            ], { duration: 900 + (i % 4) * 80, easing: "cubic-bezier(.1,.6,.3,1)", fill: "forwards" }));
        }
    }
    return { spawned, anims };
}
const orbBurst = {
    id: "orb.burst",
    minQuality: "low",
    target: () => "orb",
    priority: 2,
    durationMs: 1300,
    start({ targets, quality }) {
        const layer = targets.get("fx-layer");
        const orb = targets.get("orb");
        if (!layer || !canAnimate(orb))
            return;
        const { spawned, anims } = burstRing(ACCENTS.blue.soft, quality, layer, orb);
        anims.push(orb.animate([{ transform: "scale(1)" }, { transform: "scale(1.1)", offset: 0.25 }, { transform: "scale(1)" }], {
            duration: 900,
            easing: "cubic-bezier(.2,.8,.2,1)",
        }));
        targets.get("webgl-orb")?.burst(ACCENTS.blue.soft);
        return track(anims, spawned);
    },
};
const orbError = {
    id: "orb.error",
    minQuality: "low",
    target: () => "orb",
    priority: 3,
    durationMs: 1500,
    start({ targets, quality }) {
        const layer = targets.get("fx-layer");
        const orb = targets.get("orb");
        if (!layer || !canAnimate(orb))
            return;
        const { spawned, anims } = burstRing(PALETTE.danger, quality, layer, orb);
        anims.push(orb.animate([
            { filter: "none", transform: "translateX(0)" },
            { filter: "hue-rotate(150deg) saturate(1.8)", transform: "translateX(-4px)", offset: 0.15 },
            { filter: "hue-rotate(150deg) saturate(1.8)", transform: "translateX(4px)", offset: 0.3 },
            { filter: "hue-rotate(150deg) saturate(1.6)", transform: "translateX(0)", offset: 0.5 },
            { filter: "none", transform: "translateX(0)" },
        ], { duration: 1400, easing: "ease-out" }));
        targets.get("webgl-orb")?.burst(PALETTE.danger);
        return track(anims, spawned);
    },
};
const orbFlicker = {
    id: "orb.flicker",
    minQuality: "high",
    throttleMs: 140,
    start({ targets }) {
        const orb = targets.get("orb");
        if (!canAnimate(orb))
            return;
        orb.animate([{ filter: "brightness(1)" }, { filter: "brightness(1.35)" }, { filter: "brightness(1)" }], {
            duration: 130,
            composite: "replace",
        });
    },
};
const orbEnergy = {
    id: "orb.energy",
    minQuality: "high",
    start({ targets, params }) {
        targets.get("webgl-orb")?.setEnergy(Number(params.level ?? 0));
    },
};
J.fxEngineLib.push(orbCharge, orbBurst, orbError, orbFlicker, orbEnergy);
})();