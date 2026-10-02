'use strict';
/* =========================================================
   JARVIS OS — Rdzeń silnika efektów (createEffectEngine)
   GENEROWANE z katalog/02-engine-effects/_runtime/effect-engine.ts przez tools/fx-port.mjs — nie edytuj ręcznie.
   Regeneracja: node tools/fx-port.mjs
   ========================================================= */
(() => {
const { atLeast } = J.fxQuality;
const MAX_ACTIVE = 64;
function createEffectEngine(options) {
    const { bus, clock, targets, getQuality } = options;
    const registry = new Map(options.library.map((d) => [d.id, d]));
    const lastPlayed = new Map();
    let active = [];
    let unsubscribeClock = null;
    const end = (entry) => {
        active = active.filter((a) => a !== entry);
        try {
            entry.handle.stop();
        }
        catch { }
        if (active.every((a) => !a.def.durationMs) && unsubscribeClock) {
            unsubscribeClock();
            unsubscribeClock = null;
        }
    };
    const tick = (_, delta) => {
        for (const entry of [...active]) {
            if (!entry.def.durationMs)
                continue;
            entry.elapsed += delta;
            const t = Math.min(1, entry.elapsed / entry.def.durationMs);
            entry.handle.frame?.(t);
            if (t >= 1)
                end(entry);
        }
    };
    const play = (id, params = {}) => {
        const def = registry.get(id);
        const quality = getQuality();
        if (!def || !atLeast(quality, def.minQuality))
            return false;
        const now = typeof performance !== "undefined" ? performance.now() : Date.now();
        if (def.throttleMs && now - (lastPlayed.get(id) ?? -Infinity) < def.throttleMs)
            return false;
        lastPlayed.set(id, now);
        const target = def.target?.(params) ?? null;
        const priority = def.priority ?? 0;
        if (target) {
            const current = active.find((a) => a.target === target);
            if (current && current.priority > priority)
                return false;
            if (current)
                end(current);
        }
        const handle = def.start({ targets, quality, params });
        if (!handle)
            return true;
        const entry = { def, handle, target, priority, elapsed: 0 };
        active.push(entry);
        if (active.length > MAX_ACTIVE) {
            const victim = [...active].sort((a, b) => a.priority - b.priority)[0];
            end(victim);
        }
        if (def.durationMs && !unsubscribeClock)
            unsubscribeClock = clock.subscribe(tick);
        return true;
    };
    const unbind = options.bindings.map((b) => bus.on(b.on, (event) => {
        if (b.when && !b.when(event))
            return;
        play(b.play, b.params?.(event) ?? {});
    }));
    return {
        play,
        stopAll: () => [...active].forEach(end),
        get activeCount() {
            return active.length;
        },
        dispose() {
            unbind.forEach((u) => u());
            [...active].forEach(end);
        },
    };
}
J.fxEngineCore = { createEffectEngine };
})();
