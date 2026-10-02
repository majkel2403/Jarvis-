'use strict';
/* =========================================================
   JARVIS OS — Silnik efektów — actions (11)
   GENEROWANE z zrodla/effects/library/actions.ts przez tools/fx-port.mjs — nie edytuj ręcznie.
   Regeneracja: node tools/fx-port.mjs
   ========================================================= */
/* id: boot.sequence, screen.brackets, orb.wake, orb.think, command.launch, fly.to, target.ping, sound.waves, screen.sweep, screen.edge, keycap.hint */
(() => {
J.fxEngineLib = J.fxEngineLib || [];
const { ACCENTS, PALETTE } = J.fxTokens;
const { atLeast } = J.fxQuality;
const { canAnimate, centerWithin, spawn, track, viewportCenter } = J.fxDom;
/** The first registered and visible target among the keys (e.g. sidebar tile, else dock tile). */
function firstVisible(targets, keys) {
    for (const key of keys) {
        const el = targets.get(key);
        if (el && el.getClientRects().length > 0)
            return el;
    }
    return undefined;
}
const widgetTargets = (widget) => [`tile:${widget}`, `dock:${widget}`];
function ringAround(layer, el, color, rings = 1) {
    const c = viewportCenter(el);
    const size = Math.max(c.w, c.h) + 8;
    const spawned = [];
    const anims = Array.from({ length: rings }, (_, i) => {
        const ring = spawn(layer, {
            left: `${c.x - size / 2}px`,
            top: `${c.y - size / 2}px`,
            width: `${size}px`,
            height: `${size}px`,
            borderRadius: "14px",
            border: `1.5px solid ${color}`,
            boxShadow: `0 0 14px ${color}`,
        });
        spawned.push(ring);
        return ring.animate([
            { transform: "scale(0.85)", opacity: 0.95 },
            { transform: "scale(1.7)", opacity: 0 },
        ], { duration: 700, delay: i * 160, easing: "cubic-bezier(.1,.7,.3,1)", fill: "both" });
    });
    return { anims, spawned };
}
/** Power-up when the desktop appears: orb ignites, a ring rolls out and HUD brackets draw. */
const bootSequence = {
    id: "boot.sequence",
    minQuality: "low",
    durationMs: 1800,
    start({ targets, quality }) {
        const orb = targets.get("orb");
        const layer = targets.get("fx-layer");
        const anims = [];
        const spawned = [];
        if (canAnimate(orb)) {
            anims.push(orb.animate([
                { transform: "scale(0.6)", opacity: 0, filter: "brightness(2.2)" },
                { transform: "scale(1.06)", opacity: 1, filter: "brightness(1.6)", offset: 0.55 },
                { transform: "scale(1)", opacity: 1, filter: "brightness(1)" },
            ], { duration: 1200, delay: 250, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" }));
        }
        if (layer && orb && atLeast(quality, "high")) {
            const { x, y, size } = centerWithin(orb, layer);
            const ring = spawn(layer, {
                left: `${x - size / 2}px`,
                top: `${y - size / 2}px`,
                width: `${size}px`,
                height: `${size}px`,
                borderRadius: "9999px",
                border: `2px solid ${ACCENTS.cyan.soft}`,
                boxShadow: `0 0 30px ${ACCENTS.cyan.soft}`,
            });
            spawned.push(ring);
            anims.push(ring.animate([
                { transform: "scale(0.4)", opacity: 0 },
                { transform: "scale(0.9)", opacity: 1, offset: 0.4 },
                { transform: "scale(2.6)", opacity: 0 },
            ], { duration: 1300, delay: 700, easing: "cubic-bezier(.1,.7,.3,1)", fill: "both" }));
            targets.get("webgl-orb")?.burst(ACCENTS.cyan.soft);
        }
        const screen = targets.get("screen-fx");
        if (screen) {
            const b = brackets(screen, 1400);
            anims.push(...b.anims);
            spawned.push(...b.spawned);
        }
        return track(anims, spawned);
    },
};
function brackets(layer, duration, color = ACCENTS.cyan.soft) {
    const corners = [
        { left: "14px", top: "14px", borderWidth: "2px 0 0 2px", from: "translate(-24px,-24px)" },
        { right: "14px", top: "14px", borderWidth: "2px 2px 0 0", from: "translate(24px,-24px)" },
        { left: "14px", bottom: "14px", borderWidth: "0 0 2px 2px", from: "translate(-24px,24px)" },
        { right: "14px", bottom: "14px", borderWidth: "0 2px 2px 0", from: "translate(24px,24px)" },
    ];
    const spawned = [];
    const anims = corners.map(({ from, ...pos }) => {
        const el = spawn(layer, {
            ...pos,
            width: "56px",
            height: "56px",
            borderStyle: "solid",
            borderColor: color,
            filter: `drop-shadow(0 0 6px ${color})`,
        });
        spawned.push(el);
        return el.animate([
            { transform: from, opacity: 0 },
            { transform: "translate(0,0)", opacity: 1, offset: 0.3 },
            { transform: "translate(0,0)", opacity: 1, offset: 0.7 },
            { transform: "translate(0,0) scale(0.9)", opacity: 0 },
        ], { duration, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" });
    });
    return { anims, spawned };
}
const screenBrackets = {
    id: "screen.brackets",
    minQuality: "low",
    durationMs: 1300,
    start({ targets }) {
        const layer = targets.get("screen-fx");
        if (!layer)
            return;
        const { anims, spawned } = brackets(layer, 1200);
        return track(anims, spawned);
    },
};
/** Orb pulse and particle shiver when the user comes back to the tab. */
const orbWake = {
    id: "orb.wake",
    minQuality: "low",
    throttleMs: 4000,
    durationMs: 900,
    start({ targets }) {
        const orb = targets.get("orb");
        targets.get("webgl-orb")?.burst(ACCENTS.blue.soft);
        if (!canAnimate(orb))
            return;
        return track([
            orb.animate([
                { filter: "brightness(1)", transform: "scale(1)" },
                { filter: "brightness(1.6)", transform: "scale(1.05)", offset: 0.3 },
                { filter: "brightness(1)", transform: "scale(1)" },
            ], { duration: 800, easing: "ease-out" }),
        ]);
    },
};
/** Slow "thinking" breath while the timeline waits for the model's reply. */
const orbThink = {
    id: "orb.think",
    minQuality: "low",
    target: () => "orb",
    priority: 1,
    durationMs: 20_000,
    start({ targets }) {
        const orb = targets.get("orb");
        if (!canAnimate(orb))
            return;
        const finish = targets.get("node:finish");
        const anims = [
            orb.animate([
                { transform: "scale(1)", filter: "brightness(1) hue-rotate(0deg)" },
                { transform: "scale(1.035)", filter: "brightness(1.25) hue-rotate(25deg)" },
                { transform: "scale(1)", filter: "brightness(1) hue-rotate(0deg)" },
            ], { duration: 1400, iterations: Infinity, easing: "ease-in-out" }),
        ];
        if (canAnimate(finish)) {
            anims.push(finish.animate([
                { boxShadow: "0 0 0 0 rgb(192 132 252 / 0)" },
                { boxShadow: "0 0 0 2px rgb(192 132 252 / 0.45), 0 0 26px 2px rgb(192 132 252 / 0.5)" },
                { boxShadow: "0 0 0 0 rgb(192 132 252 / 0)" },
            ], { duration: 1400, iterations: Infinity, easing: "ease-in-out" }));
        }
        return track(anims);
    },
};
/** A bright comet from the chat input into the orb when a command is sent. */
const commandLaunch = {
    id: "command.launch",
    minQuality: "low",
    durationMs: 800,
    start({ targets, quality }) {
        const layer = targets.get("screen-fx");
        const from = targets.get("chat-input") ?? targets.get("panel:chat");
        const orb = targets.get("orb");
        if (!layer || !from || !orb)
            return;
        const a = viewportCenter(from);
        const b = viewportCenter(orb);
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        const spawned = [];
        const anims = [];
        const head = spawn(layer, {
            left: `${a.x - 5}px`,
            top: `${a.y - 5}px`,
            width: "10px",
            height: "10px",
            borderRadius: "9999px",
            background: "#fff",
            boxShadow: `0 0 16px 6px ${ACCENTS.cyan.soft}`,
        });
        spawned.push(head);
        anims.push(head.animate([
            { transform: "translate(0,0) scale(0.6)", opacity: 0 },
            { opacity: 1, offset: 0.12 },
            { transform: `translate(${dx}px, ${dy}px) scale(1.4)`, opacity: 0.2 },
        ], { duration: 620, easing: "cubic-bezier(.5,0,.9,.5)", fill: "forwards" }));
        if (atLeast(quality, "high")) {
            const len = Math.hypot(dx, dy);
            const tail = spawn(layer, {
                left: `${a.x}px`,
                top: `${a.y - 1}px`,
                width: `${len}px`,
                height: "2px",
                transformOrigin: "0 50%",
                background: `linear-gradient(90deg, transparent, ${ACCENTS.cyan.soft}, #fff)`,
                transform: `rotate(${angle}deg) scaleX(0)`,
            });
            spawned.push(tail);
            anims.push(tail.animate([
                { transform: `rotate(${angle}deg) scaleX(0)`, opacity: 1 },
                { transform: `rotate(${angle}deg) scaleX(1)`, opacity: 0.8, offset: 0.7 },
                { transform: `rotate(${angle}deg) scaleX(1)`, opacity: 0 },
            ], { duration: 720, easing: "cubic-bezier(.5,0,.9,.5)", fill: "forwards" }));
        }
        return track(anims, spawned);
    },
};
/** A glowing parcel flies from one element to a widget tile, which then pulses on arrival. */
const flyTo = {
    id: "fly.to",
    minQuality: "low",
    durationMs: 1300,
    start({ targets, params, quality }) {
        const layer = targets.get("screen-fx");
        const from = firstVisible(targets, [params.from, "panel:widget", "panel:chat"].filter(Boolean));
        const to = firstVisible(targets, widgetTargets(params.widget));
        if (!layer || !from || !to)
            return;
        const a = viewportCenter(from);
        const b = viewportCenter(to);
        const color = String(params.color ?? ACCENTS.blue.soft);
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const lift = -Math.max(60, Math.abs(dx) * 0.3);
        const parcel = spawn(layer, {
            left: `${a.x - 9}px`,
            top: `${a.y - 9}px`,
            width: "18px",
            height: "18px",
            borderRadius: "6px",
            background: `linear-gradient(135deg, #fff, ${color})`,
            boxShadow: `0 0 18px 4px ${color}`,
        });
        const spawned = [parcel];
        const anims = [
            parcel.animate([
                { transform: "translate(0,0) scale(0.4) rotate(0deg)", opacity: 0 },
                { transform: `translate(${dx * 0.15}px, ${dy * 0.15 + lift * 0.5}px) scale(1.15) rotate(90deg)`, opacity: 1, offset: 0.2 },
                { transform: `translate(${dx * 0.6}px, ${dy * 0.6 + lift}px) scale(0.9) rotate(220deg)`, opacity: 1, offset: 0.6 },
                { transform: `translate(${dx}px, ${dy}px) scale(0.3) rotate(360deg)`, opacity: 0.4 },
            ], { duration: 780, easing: "cubic-bezier(.4,0,.6,1)", fill: "forwards" }),
        ];
        const ring = ringAround(layer, to, color, atLeast(quality, "high") ? 2 : 1);
        ring.anims.forEach((r) => {
            if (r.effect)
                r.effect.updateTiming({ delay: 720 + Number(r.effect.getTiming().delay ?? 0) });
        });
        anims.push(...ring.anims);
        spawned.push(...ring.spawned);
        if (canAnimate(to)) {
            anims.push(to.animate([{ transform: "scale(1)" }, { transform: "scale(1.25)", filter: "brightness(1.6)", offset: 0.35 }, { transform: "scale(1)" }], { duration: 480, delay: 740, easing: "cubic-bezier(.2,.8,.2,1)" }));
        }
        return track(anims, spawned);
    },
};
/** Ring pulse around any registered target. */
const targetPing = {
    id: "target.ping",
    minQuality: "low",
    durationMs: 1000,
    start({ targets, params }) {
        const layer = targets.get("screen-fx");
        const keys = (Array.isArray(params.keys) ? params.keys : [params.key]);
        const el = firstVisible(targets, keys);
        if (!layer || !el)
            return;
        const { anims, spawned } = ringAround(layer, el, String(params.color ?? ACCENTS.cyan.soft), Number(params.rings ?? 1));
        return track(anims, spawned);
    },
};
/** Concentric sound waves from the speaker button when audio is switched on (one implosion when muted). */
const soundWaves = {
    id: "sound.waves",
    minQuality: "low",
    durationMs: 1100,
    start({ targets, params }) {
        const layer = targets.get("screen-fx");
        const el = targets.get("ui:mute");
        if (!layer || !el)
            return;
        const c = viewportCenter(el);
        const on = Boolean(params.on);
        const spawned = [];
        const anims = (on ? [0, 140, 280] : [0]).map((delay) => {
            const ring = spawn(layer, {
                left: `${c.x - 16}px`,
                top: `${c.y - 16}px`,
                width: "32px",
                height: "32px",
                borderRadius: "9999px",
                border: `1.5px solid ${on ? ACCENTS.cyan.soft : "#94a3b8"}`,
            });
            spawned.push(ring);
            return ring.animate(on
                ? [
                    { transform: "scale(0.6)", opacity: 0.9 },
                    { transform: "scale(2.2)", opacity: 0 },
                ]
                : [
                    { transform: "scale(2)", opacity: 0 },
                    { transform: "scale(0.5)", opacity: 0.9, offset: 0.8 },
                    { transform: "scale(0.4)", opacity: 0 },
                ], { duration: 700, delay, easing: "ease-out", fill: "both" });
        });
        return track(anims, spawned);
    },
};
/** Full-screen scan line, for global changes like brightness or effect quality. */
const screenSweep = {
    id: "screen.sweep",
    minQuality: "low",
    durationMs: 1000,
    start({ targets, params }) {
        const layer = targets.get("screen-fx");
        if (!layer)
            return;
        const color = String(params.color ?? ACCENTS.cyan.soft);
        const line = spawn(layer, {
            left: "0",
            right: "0",
            top: "0",
            height: "120px",
            background: `linear-gradient(to bottom, transparent, ${color}22 75%, ${color} 99%, transparent)`,
        });
        return track([
            line.animate([
                { transform: "translateY(-130px)", opacity: 1 },
                { transform: `translateY(${window.innerHeight}px)`, opacity: 0.6 },
            ], { duration: 900, easing: "cubic-bezier(.45,0,.55,1)", fill: "forwards" }),
        ], [line]);
    },
};
/** Edge glow for connectivity: amber when offline, green when back. */
const screenEdge = {
    id: "screen.edge",
    minQuality: "low",
    durationMs: 1800,
    start({ targets, params }) {
        const layer = targets.get("screen-fx");
        if (!layer)
            return;
        const color = params.online ? PALETTE.success : PALETTE.warning;
        const edge = spawn(layer, { inset: "0", boxShadow: `inset 0 0 90px 10px ${color}55, inset 0 0 0 2px ${color}88` });
        return track([edge.animate([{ opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 0.4, offset: 0.5 }, { opacity: 1, offset: 0.65 }, { opacity: 0 }], { duration: 1700, fill: "forwards" })], [edge]);
    },
};
/** A keycap overlay showing which shortcut was used. */
const keycapHint = {
    id: "keycap.hint",
    minQuality: "low",
    target: () => "keycap",
    durationMs: 1100,
    start({ targets, params }) {
        const layer = targets.get("screen-fx");
        if (!layer)
            return;
        const cap = spawn(layer, {
            left: "50%",
            bottom: "110px",
            minWidth: "52px",
            height: "52px",
            padding: "0 14px",
            display: "grid",
            placeItems: "center",
            borderRadius: "12px",
            border: "1px solid rgb(125 211 252 / 0.5)",
            background: "linear-gradient(180deg, rgb(30 58 138 / 0.85), rgb(7 16 43 / 0.9))",
            boxShadow: "0 6px 0 rgb(7 16 43 / 0.9), 0 0 24px rgb(56 189 248 / 0.45)",
            color: "#e0f2fe",
            font: "600 18px ui-sans-serif, system-ui",
        });
        cap.textContent = String(params.key ?? "");
        return track([
            cap.animate([
                { transform: "translate(-50%, 12px) scale(0.7)", opacity: 0 },
                { transform: "translate(-50%, 0) scale(1.05)", opacity: 1, offset: 0.18 },
                { transform: "translate(-50%, 4px) scale(0.96)", opacity: 1, offset: 0.3 },
                { transform: "translate(-50%, 0) scale(1)", opacity: 1, offset: 0.75 },
                { transform: "translate(-50%, -10px) scale(1)", opacity: 0 },
            ], { duration: 1050, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" }),
        ], [cap]);
    },
};
J.fxEngineLib.push(bootSequence, screenBrackets, orbWake, orbThink, commandLaunch, flyTo, targetPing, soundWaves, screenSweep, screenEdge, keycapHint);
})();