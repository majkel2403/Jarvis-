'use strict';
/* =========================================================
   JARVIS OS — Silnik efektów — graph (3)
   GENEROWANE z zrodla/effects/library/graph.ts przez tools/fx-port.mjs — nie edytuj ręcznie.
   Regeneracja: node tools/fx-port.mjs
   ========================================================= */
/* id: line.flow, node.flash, ripple.burst */
(() => {
J.fxEngineLib = J.fxEngineLib || [];
const { atLeast } = J.fxQuality;
const { canAnimate, spawn, track } = J.fxDom;
const SVG_NS = "http://www.w3.org/2000/svg";
/** A bright pulse that travels along the connector from the orb to the node that just started. */
const lineFlow = {
    id: "line.flow",
    minQuality: "high",
    durationMs: 950,
    start({ targets, params }) {
        const path = targets.get(`line:${params.nodeId}`);
        if (!path || typeof path.getTotalLength !== "function")
            return;
        const length = path.getTotalLength();
        if (!length)
            return;
        const seg = Math.max(24, length * 0.18);
        const pulse = document.createElementNS(SVG_NS, "path");
        pulse.setAttribute("d", path.getAttribute("d") ?? "");
        pulse.setAttribute("fill", "none");
        pulse.setAttribute("stroke", "#f0f9ff");
        pulse.setAttribute("stroke-width", "2.6");
        pulse.setAttribute("stroke-linecap", "round");
        pulse.setAttribute("stroke-dasharray", `${seg} ${length + seg}`);
        path.parentNode?.appendChild(pulse);
        return track([
            pulse.animate([{ strokeDashoffset: seg, opacity: 1 }, { strokeDashoffset: -length, opacity: 0.4 }], {
                duration: 900,
                easing: "cubic-bezier(.4,0,.2,1)",
                fill: "forwards",
            }),
        ], [pulse]);
    },
};
const nodeFlash = {
    id: "node.flash",
    minQuality: "low",
    target: (p) => `node:${p.nodeId}`,
    durationMs: 700,
    start({ targets, params, quality }) {
        const card = targets.get(`node:${params.nodeId}`);
        if (!canAnimate(card))
            return;
        const rich = atLeast(quality, "high");
        return track([
            card.animate(rich
                ? [
                    { transform: "scale(1)", filter: "brightness(1)" },
                    { transform: "scale(1.04)", filter: "brightness(1.7)", offset: 0.3 },
                    { transform: "scale(1)", filter: "brightness(1)" },
                ]
                : [{ transform: "scale(1)" }, { transform: "scale(1.03)", offset: 0.3 }, { transform: "scale(1)" }], { duration: 650, easing: "cubic-bezier(.2,.8,.2,1)" }),
        ]);
    },
};
/** A strong single ripple on the lake surface under the orb. */
const rippleBurst = {
    id: "ripple.burst",
    minQuality: "high",
    durationMs: 1700,
    start({ targets }) {
        const water = targets.get("water");
        const layer = targets.get("fx-layer");
        if (!water || !layer)
            return;
        const w = water.offsetWidth;
        const ring = spawn(layer, {
            left: `${water.offsetLeft - w / 2}px`,
            top: `${water.offsetTop - w * 0.08}px`,
            width: `${w}px`,
            height: `${w * 0.16}px`,
            borderRadius: "50%",
            border: "2px solid rgb(186 230 253 / 0.9)",
            boxShadow: "0 0 30px rgb(56 189 248 / 0.8)",
        });
        return track([
            ring.animate([
                { transform: "scale(0.3)", opacity: 1 },
                { transform: "scale(1.6)", opacity: 0 },
            ], { duration: 1600, easing: "cubic-bezier(.1,.6,.3,1)", fill: "forwards" }),
        ], [ring]);
    },
};
J.fxEngineLib.push(lineFlow, nodeFlash, rippleBurst);
})();