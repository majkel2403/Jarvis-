'use strict';
/* =========================================================
   JARVIS OS — Silnik efektów — links (5)
   GENEROWANE z zrodla/effects/library/links.ts przez tools/fx-port.mjs — nie edytuj ręcznie.
   Regeneracja: node tools/fx-port.mjs
   ========================================================= */
/* id: node.sparks, node.scan, energy.arc, line.return, token.stream */
(() => {
J.fxEngineLib = J.fxEngineLib || [];
const { NODE_BY_ID } = J.fxNodes;
const { ACCENTS } = J.fxTokens;
const { SVG_NS, boltPoints, centerWithin, spawn, track, viewportCenter } = J.fxDom;
const nodeColor = (id) => ACCENTS[NODE_BY_ID[id]?.color ?? "blue"].soft;
const skipStatus = (id) => NODE_BY_ID[id]?.variant === "status";
/** Sparks and a check ring bursting from a node card when its step finishes. */
const nodeSparks = {
    id: "node.sparks",
    minQuality: "high",
    durationMs: 900,
    start({ targets, params, quality }) {
        const layer = targets.get("fx-layer");
        const card = targets.get(`node:${params.nodeId}`);
        if (!layer || !card || skipStatus(params.nodeId))
            return;
        const { x, y } = centerWithin(card, layer);
        const r = card.getBoundingClientRect();
        const color = nodeColor(params.nodeId);
        const spawned = [];
        const anims = [];
        const outline = spawn(layer, {
            left: `${x - r.width / 2}px`,
            top: `${y - r.height / 2}px`,
            width: `${r.width}px`,
            height: `${r.height}px`,
            borderRadius: "14px",
            border: `1.5px solid ${color}`,
            boxShadow: `0 0 22px ${color}, inset 0 0 14px ${color}`,
        });
        spawned.push(outline);
        anims.push(outline.animate([
            { transform: "scale(1)", opacity: 0.95 },
            { transform: "scale(1.12, 1.35)", opacity: 0 },
        ], { duration: 750, easing: "cubic-bezier(.2,.7,.3,1)", fill: "forwards" }));
        const count = quality === "ultra" ? 16 : 10;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
            const dist = r.width * (0.45 + Math.random() * 0.35);
            const spark = spawn(layer, {
                left: `${x - 2}px`,
                top: `${y - 2}px`,
                width: "4px",
                height: "4px",
                borderRadius: "9999px",
                background: "#fff",
                boxShadow: `0 0 8px 2px ${color}`,
            });
            spawned.push(spark);
            anims.push(spark.animate([
                { transform: "translate(0,0) scale(1)", opacity: 1 },
                { transform: `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist * 0.55}px) scale(0.2)`, opacity: 0 },
            ], { duration: 600 + Math.random() * 250, easing: "cubic-bezier(.1,.7,.3,1)", fill: "forwards" }));
        }
        return track(anims, spawned);
    },
};
/** A light bar sweeping across a node card while its step starts. */
const nodeScan = {
    id: "node.scan",
    minQuality: "high",
    durationMs: 1000,
    start({ targets, params }) {
        const card = targets.get(`node:${params.nodeId}`);
        if (!card)
            return;
        const bar = spawn(card, {
            top: "0",
            bottom: "0",
            left: "0",
            width: "45%",
            background: `linear-gradient(90deg, transparent, ${nodeColor(params.nodeId)}55, rgba(255,255,255,0.35), transparent)`,
            mixBlendMode: "screen",
        });
        return track([
            bar.animate([{ transform: "translateX(-110%)" }, { transform: "translateX(260%)" }], {
                duration: 900,
                easing: "cubic-bezier(.4,0,.2,1)",
                fill: "forwards",
            }),
        ], [bar]);
    },
};
/** A flickering lightning arc from the orb to the node that just completed. */
const energyArc = {
    id: "energy.arc",
    minQuality: "high",
    durationMs: 560,
    start({ targets, params, quality }) {
        const layer = targets.get("fx-layer");
        const orb = targets.get("orb");
        const card = targets.get(`node:${params.nodeId}`);
        if (!layer || !orb || !card || skipStatus(params.nodeId))
            return;
        const a = centerWithin(orb, layer);
        const b = centerWithin(card, layer);
        const color = nodeColor(params.nodeId);
        const rect = layer.getBoundingClientRect();
        const svg = document.createElementNS(SVG_NS, "svg");
        svg.setAttribute("width", `${rect.width}`);
        svg.setAttribute("height", `${rect.height}`);
        svg.setAttribute("class", "pointer-events-none absolute inset-0 overflow-visible");
        const bolts = quality === "ultra" ? 3 : 2;
        const lines = [];
        for (let i = 0; i < bolts; i++) {
            const line = document.createElementNS(SVG_NS, "polyline");
            line.setAttribute("points", boltPoints(a.x, a.y, b.x, b.y, 10, 10 + i * 6));
            line.setAttribute("fill", "none");
            line.setAttribute("stroke", i === 0 ? "#f8fafc" : color);
            line.setAttribute("stroke-width", i === 0 ? "1.6" : "1");
            line.setAttribute("stroke-linejoin", "round");
            line.style.filter = `drop-shadow(0 0 4px ${color})`;
            svg.appendChild(line);
            lines.push(line);
        }
        layer.appendChild(svg);
        const reshape = () => lines.forEach((l, i) => l.setAttribute("points", boltPoints(a.x, a.y, b.x, b.y, 10, 10 + i * 6)));
        let lastShape = 0;
        const anim = svg.animate([{ opacity: 0 }, { opacity: 1, offset: 0.1 }, { opacity: 0.4, offset: 0.3 }, { opacity: 1, offset: 0.45 }, { opacity: 0 }], { duration: 520, easing: "linear", fill: "forwards" });
        const handle = track([anim], [svg]);
        return {
            frame(t) {
                if (t - lastShape > 0.18) {
                    lastShape = t;
                    reshape();
                }
            },
            stop: handle.stop,
        };
    },
};
/** A pulse travelling back from the node to the orb along its connector: "result delivered". */
const lineReturn = {
    id: "line.return",
    minQuality: "high",
    durationMs: 850,
    start({ targets, params }) {
        const path = targets.get(`line:${params.nodeId}`);
        if (!path || typeof path.getTotalLength !== "function" || skipStatus(params.nodeId))
            return;
        const length = path.getTotalLength();
        if (!length)
            return;
        const seg = Math.max(18, length * 0.14);
        const pulse = document.createElementNS(SVG_NS, "path");
        pulse.setAttribute("d", path.getAttribute("d") ?? "");
        pulse.setAttribute("fill", "none");
        pulse.setAttribute("stroke", nodeColor(params.nodeId));
        pulse.setAttribute("stroke-width", "3");
        pulse.setAttribute("stroke-linecap", "round");
        pulse.setAttribute("stroke-dasharray", `${seg} ${length + seg}`);
        path.parentNode?.appendChild(pulse);
        return track([
            pulse.animate([{ strokeDashoffset: -length, opacity: 1 }, { strokeDashoffset: seg, opacity: 0.2 }], {
                duration: 800,
                easing: "cubic-bezier(.5,0,.3,1)",
                fill: "forwards",
            }),
        ], [pulse]);
    },
};
/** Glowing token motes flying from the model (or the orb) into the chat as the reply streams. */
const tokenStream = {
    id: "token.stream",
    minQuality: "high",
    throttleMs: 70,
    durationMs: 750,
    start({ targets }) {
        const layer = targets.get("screen-fx");
        const source = targets.get("node:model") ?? targets.get("orb");
        const dest = targets.get("panel:chat");
        if (!layer || !source || !dest)
            return;
        const a = viewportCenter(source);
        const b = viewportCenter(dest);
        const tx = b.x - b.w * 0.3 + (Math.random() - 0.5) * b.w * 0.3;
        const ty = b.y + (Math.random() - 0.5) * Math.min(b.h, 60);
        const color = Math.random() < 0.5 ? ACCENTS.cyan.soft : ACCENTS.blue.soft;
        const dot = spawn(layer, {
            left: `${a.x - 2.5}px`,
            top: `${a.y - 2.5}px`,
            width: "5px",
            height: "5px",
            borderRadius: "9999px",
            background: "#fff",
            boxShadow: `0 0 10px 3px ${color}`,
        });
        const dx = tx - a.x;
        const dy = ty - a.y;
        const lift = -Math.min(120, Math.abs(dx) * 0.25);
        return track([
            dot.animate([
                { transform: "translate(0,0) scale(0.6)", opacity: 0 },
                { transform: `translate(${dx * 0.5}px, ${dy * 0.5 + lift}px) scale(1)`, opacity: 1, offset: 0.5 },
                { transform: `translate(${dx}px, ${dy}px) scale(0.4)`, opacity: 0 },
            ], { duration: 700, easing: "cubic-bezier(.4,0,.6,1)", fill: "forwards" }),
        ], [dot]);
    },
};
J.fxEngineLib.push(nodeSparks, nodeScan, energyArc, lineReturn, tokenStream);
})();