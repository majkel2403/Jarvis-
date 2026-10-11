# JARVIS / Cinematic Engine

A standalone **React + TypeScript + React Three Fiber** interactive science-fiction command-interface demo. Built from the approved [design specification](../../docs/superpowers/specs/2026-10-08-cinematic-engine-design.md) and [implementation plan](../../docs/superpowers/plans/2026-10-08-cinematic-engine.md).

> **Experimental implementation:** Not yet full Cinematic Engine v1.0. It does not modify Jarvis OS and is not connected to Hermes, Bridge or any real agent. All agent workflows, telemetry, radar data and results are clearly labeled DEMO/SIMULATED.

## Run locally

Node.js 22 or newer is recommended.

```bash
cd apps/cinematic-engine
npm install
npm run dev
```

Open the URL printed by Vite. The application does not require API keys or a backend.

## Features in this increment

- Hybrid WebGL + DOM design: multi-ring particle reactor, scan sweep, bloom, layered radar telemetry, a six-agent demo graph, animated readouts and command panels.
- Three scenes: **System Boot** (4.2 s), **AI Processing** (16 s), **Command Center** (12 s). AUTO SHOWCASE also contains a 2 s outro and 0.8 s reset; entire cycle 35 s.
- AUTO SHOWCASE and INTERACTIVE, scene switching, simulation outcomes, playback speed (0.5×, 1×, 1.5×), pause, replay and timeline seek.
- Deterministic seed-based demo event generator, validator, pure virtual-time clock and projections.
- Sound cues using the Web Audio API only after a user gesture, with mute and seek-aware cue suppression.
- ULTRA, BALANCED, LOW and SAFE 2D profiles; adaptive quality downgrade, WebGL context-loss fallback.
- Responsive mobile HUD, touch controls, accessible button labels and reduced-motion preference.

### Controls

| Action | Control |
|---|---|
| Choose scene | Top scene selector or keys 1/2/3 |
| Watch the complete sequence | AUTO SHOWCASE |
| Trigger successful agent demo | RUN DEMO |
| Trigger failure path | TEST ERROR |
| Pause / play | Transport button or Space |
| Replay | Transport button or R |
| Change render quality / motion / audio | Settings icon |
| Inspect history | Event log and timeline |

## Checks

```bash
npm run test:run
npm run build
npx playwright install chromium
npm run test:e2e
```

GitHub Actions workflow [Cinematic Engine CI](../../.github/workflows/cinematic-engine-ci.yml) runs unit tests, TypeScript checks, Vite build and Chromium E2E for the isolated branch. It also archives desktop and 390px-mobile browser screenshots.

## Work still open before v1.0 sign-off

This is a substantial first increment, **not a claim that all 17 approved plan tasks are finished**. Remaining: strict separation of Director, scene state machine and replay store; complete event/cue mapping for every scene; more sophisticated shader-based L4–L9 effects and cinematic camera sequences; richer agent inspector and controls; cross-browser Safari/Firefox and mobile GPU performance testing; WCAG audit; stable dependency lockfile; independent task-level reviews and final code review.

No deployment or merge has been performed. Work stays on `experiment/cinematic-engine`.
