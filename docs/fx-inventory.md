# Inwentaryzacja biblioteki efektów

> **Generowane automatycznie:** `node tools/fx-inventory.mjs` — nie edytuj ręcznie.
> Pole `status` jest zachowywane między przebiegami i służy jako tabela postępu portowania.
> Źródło danych: katalog `jarvis-efekty` (`katalog/`, `zrodla/`), ścieżka z `JARVIS_FX_KIT`.

Pozycji: **441** · wygenerowano 2026-10-02

## Podsumowanie

| Dział | Pozycji | Oczekiwano | T1 | T2 | T3 | T4 | Kod |
|---|---:|---:|---:|---:|---:|---:|---:|
| `01-signature-fx` Efekty sygnaturowe | 64 | 64 | 64 | 0 | 0 | 0 | 64 |
| `02-engine-effects` Efekty silnika | 35 | 35 | 0 | 35 | 0 | 0 | 35 |
| `03-studio-visuals` Wizualizacje FX Studio | 236 | 236 | 0 | 0 | 5 | 231 | 236 |
| `04-css-animations` Animacje CSS | 46 | 46 | 46 | 0 | 0 | 0 | 46 |
| `05-motion-ui` Ruch w UI (Motion) | 22 | 22 | 0 | 0 | 22 | 0 | 22 |
| `06-scenes` Sceny i warstwy | 10 | 10 | 0 | 0 | 10 | 0 | 10 |
| `07-primitives` Prymitywy UI | 9 | 9 | 0 | 0 | 9 | 0 | 9 |
| `08-audio` Dźwięki UI | 13 | 13 | 13 | 0 | 0 | 0 | 13 |
| `09-os-integration` Integracja z Jarvis OS | 6 | 6 | 2 | 0 | 4 | 0 | 6 |
| **Razem** | **441** | **441** | 125 | 35 | 50 | 231 | 441 |

Wysiłek: **177 × S**, **20 × M**, **8 × L**, 236 × bez kodu.

| Tier | Znaczenie |
|---|---|
| T1 | Kopiuj 1:1 — zero zależności, zero Reacta |
| T2 | Przepisz przez adapter (silnik efektów, brakujące `engine/`) |
| T3 | Przepisz na WAAPI — dziś React/Motion |
| T4 | Dokumentacja lub demo — nie przenosić |

| Status | Znaczenie |
|---|---|
| `do-przeniesienia` | Na liście, nie zrobione |
| `przeniesiony` | Skopiowany do `js/fx/` bez zmian |
| `przepisany` | Przepisany (T3 na T1/T2) |
| `pominięty` | Świadomie pominięty z powodem w README |

## `01-signature-fx` — Efekty sygnaturowe (64)

| id | rodzina | tytuł | technika | waga | minQ | czas | tier | wys. | zależności | zdarzenie w aplikacji | status |
|---|---|---|---|---|---|---:|---|---|---|---|---|
| `ambient.day-night` | ambient | Doba w 4 sekundy | scene transform (WAAPI), DOM/WAAPI | hero | — | 4600 | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | przeniesiony |
| `ambient.meteors` | ambient | Deszcz meteorów | Canvas 2D | accent | — | 4400 | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | przeniesiony |
| `data.chart` | data | Wykres wzrostu | Canvas 2D, DOM/WAAPI | accent | — | 3400 | T1 | S | — | J.emit("tasks") + adapter | przeniesiony |
| `data.heatmap` | data | Fala mapy ciepła | Canvas 2D | accent | — | 3200 | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | przeniesiony |
| `data.network` | data | Graf powiązań | Canvas 2D | accent | — | 4000 | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | przeniesiony |
| `data.orbit-kpi` | data | Orbita wskaźników | Canvas 2D, DOM/WAAPI | accent | — | 4200 | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | przeniesiony |
| `glitch.datamosh` | glitch | Datamosh | Canvas 2D, scene transform (WAAPI) | accent | — | 2200 | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | przeniesiony |
| `glitch.displace` | glitch | Płynna deformacja | SVG filter | accent | — | 2400 | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | przeniesiony |
| `glitch.failure` | glitch | Awaria krytyczna | Canvas 2D, SVG, scene transform (WAAPI), DOM/WAAPI, camera shake | hero | — | 3600 | T1 | S | — | J.ev "task.failed" | przeniesiony |
| `glitch.vhs` | glitch | Kaseta VHS | Canvas 2D, scene transform (WAAPI), DOM/WAAPI | accent | — | 3400 | T1 | S | — | online/offline + J.on("signal") | przeniesiony |
| `hud.biometric` | hud | Skan biometryczny | Canvas 2D, DOM/WAAPI | accent | — | 3600 | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | przeniesiony |
| `hud.boot-sequence` | hud | Sekwencja startowa | SVG, DOM/WAAPI, camera shake | hero | — | 4600 | T1 | M | — | koniec bootu w main.js → J.emit("app-view","booted") | przeniesiony |
| `hud.circuit` | hud | Ścieżki obwodu | Canvas 2D | micro | — | 2800 | T1 | S | — | J.ev "tool.started" | przeniesiony |
| `hud.data-windows` | hud | Okna telemetrii | Canvas 2D, SVG, DOM/WAAPI | accent | — | 4000 | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | przeniesiony |
| `hud.radar` | hud | Radar fosforowy | Canvas 2D | accent | — | 4000 | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | przeniesiony |
| `hud.spectrum` | hud | Widmo głosu | Canvas 2D | micro | — | 3000 | T1 | S | — | J.ev "model.started" | przeniesiony |
| `hud.target-lock` | hud | Namierzanie | Canvas 2D, DOM/WAAPI, camera shake | micro | — | 2400 | T1 | M | — | J.on("shortcuts") | przeniesiony |
| `hud.tron-grid` | hud | Siatka Tron | Canvas 2D | accent | — | 4000 | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | przeniesiony |
| `orb.arc-reactor` | orb | Reaktor łukowy | SVG, DOM/WAAPI, camera shake | accent | — | 2300 | T1 | S | — | J.emit("wm") — przypięcie | przeniesiony |
| `orb.charge-up` | orb | Ładowanie rdzenia | Canvas 2D, scene transform (WAAPI), camera shake | hero | — | 2600 | T1 | S | — | J.ev "task.created" | przeniesiony |
| `orb.heartbeat` | orb | Puls EKG | Canvas 2D, scene transform (WAAPI) | accent | — | 3000 | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | przeniesiony |
| `orb.holo-globe` | orb | Holo-glob | Canvas 2D | accent | — | 3600 | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | przeniesiony |
| `orb.lightning-crown` | orb | Korona piorunów | Canvas 2D, scene transform (WAAPI) | accent | — | 1800 | T1 | S | — | J.ev "tool.completed" | przeniesiony |
| `orb.magnetic-field` | orb | Pole magnetyczne | Canvas 2D | accent | — | 3000 | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | przeniesiony |
| `orb.singularity` | orb | Osobliwość | WebGL2 shader, Canvas 2D, scene transform (WAAPI), DOM/WAAPI | hero | — | 3400 | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | przeniesiony |
| `orb.solar-flare` | orb | Rozbłysk słoneczny | Canvas 2D | accent | — | 2800 | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | przeniesiony |
| `orb.sonar` | orb | Sonar | Canvas 2D, DOM/WAAPI | accent | — | 3200 | T1 | S | — | J.ev "approval.requested" / "task.paused" | przeniesiony |
| `orb.supernova` | orb | Supernowa | Canvas 2D, scene transform (WAAPI), DOM/WAAPI, camera shake | hero | — | 2400 | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | przeniesiony |
| `particles.confetti` | particles | Działka konfetti | Canvas 2D | accent | — | 3800 | T1 | S | — | J.emit("notes") + adapter (wzrost listy) | przeniesiony |
| `particles.disintegrate` | particles | Rozsypanie | Canvas 2D, real UI element | hero | — | 4000 | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | przeniesiony |
| `particles.dna` | particles | Helisa DNA | Canvas 2D | accent | — | 3800 | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | przeniesiony |
| `particles.embers` | particles | Żar | Canvas 2D, DOM/WAAPI | accent | — | 4000 | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | przeniesiony |
| `particles.fireworks` | particles | Fajerwerki | Canvas 2D, camera shake | hero | — | 4000 | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | przeniesiony |
| `particles.flow-field` | particles | Pole przepływu | Canvas 2D | accent | — | 4200 | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | przeniesiony |
| `particles.galaxy` | particles | Galaktyka | Canvas 2D | accent | — | 4000 | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | przeniesiony |
| `particles.snow` | particles | Śnieżyca | Canvas 2D, scene transform (WAAPI) | accent | — | 4400 | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | przeniesiony |
| `particles.swarm` | particles | Rój | Canvas 2D, pointer tracking | accent | — | 4200 | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | przeniesiony |
| `particles.text-assemble` | particles | Napis z pyłu | Canvas 2D, camera shake | hero | — | 3800 | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | przeniesiony |
| `pointer.comet` | pointer | Kometa kursora | Canvas 2D, pointer tracking | micro | — | 3600 | T1 | S | — | pointermove na #fxlayer | przeniesiony |
| `pointer.magnet` | pointer | Magnes | Canvas 2D, pointer tracking | micro | — | 3600 | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | przeniesiony |
| `screen.aurora` | screen | Zorza polarna | WebGL2 shader, Canvas 2D | accent | — | 4200 | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | przeniesiony |
| `screen.crt-off` | screen | Wyłączenie CRT | scene transform (WAAPI), DOM/WAAPI | hero | — | 2200 | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | przeniesiony |
| `screen.glass-shatter` | screen | Rozbita szyba | Canvas 2D, camera shake | hero | — | 3200 | T1 | M | — | wymaga ręcznego przypisania (Faza 8) | przeniesiony |
| `screen.iris` | screen | Przysłona | Canvas 2D, camera shake | accent | — | 2000 | T1 | S | — | J.on("app-view") — otwarcie panelu | przeniesiony |
| `screen.light-leak` | screen | Przebłysk filmu | Canvas 2D, DOM/WAAPI | accent | — | 3600 | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | przeniesiony |
| `screen.lockdown` | screen | Blokada | scene transform (WAAPI), DOM/WAAPI, camera shake | hero | — | 3200 | T1 | S | — | J.emit("market-alert") / "task-due" / "timer-ended" | przeniesiony |
| `screen.matrix-rain` | screen | Deszcz kodu | Canvas 2D, DOM/WAAPI | accent | — | 3400 | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | przeniesiony |
| `screen.pixel-dissolve` | screen | Rozpad pikseli | Canvas 2D | accent | — | 2400 | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | przeniesiony |
| `screen.ripples` | screen | Interferencja fal | WebGL2 shader, Canvas 2D | accent | — | 3600 | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | przeniesiony |
| `screen.shockwave` | screen | Uderzenie w taflę | Canvas 2D, scene transform (WAAPI), DOM/WAAPI, camera shake | accent | — | 2400 | T1 | S | — | online/offline + J.on("signal") | przeniesiony |
| `screen.thermal` | screen | Termowizja | SVG, SVG filter, scene transform (WAAPI), DOM/WAAPI | accent | — | 3200 | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | przeniesiony |
| `screen.warp-jump` | screen | Skok nadświetlny | Canvas 2D, scene transform (WAAPI), DOM/WAAPI, camera shake | hero | — | 3000 | T1 | S | — | fullscreenchange | przeniesiony |
| `success.gold-rain` | success | Złoty deszcz | Canvas 2D | accent | — | 3800 | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | przeniesiony |
| `success.level-up` | success | Awans | Canvas 2D, DOM/WAAPI | accent | — | 3000 | T1 | S | — | J.emit("tasks") + adapter (zmiana flagi) | przeniesiony |
| `success.trophy` | success | Trofeum | Canvas 2D, SVG, scene transform (WAAPI), DOM/WAAPI | hero | — | 3200 | T1 | M | — | J.ev "task.completed" | przeniesiony |
| `text.decode` | text | Dekodowanie | DOM/WAAPI | accent | — | 2600 | T1 | S | — | J.emit("thread") — nowa wiadomość użytkownika | przeniesiony |
| `text.kinetic-slam` | text | Uderzenie słów | scene transform (WAAPI), DOM/WAAPI, camera shake | hero | — | 3000 | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | przeniesiony |
| `text.neon` | text | Neon | DOM/WAAPI | accent | — | 3600 | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | przeniesiony |
| `text.split` | text | Cięcie | DOM/WAAPI, camera shake | accent | — | 2600 | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | przeniesiony |
| `text.terminal` | text | Terminal | DOM/WAAPI | accent | — | 3400 | T1 | S | — | J.emit("proc-end") / stan panelu logu | przeniesiony |
| `transition.blinds` | transition | Żaluzje | DOM/WAAPI | accent | — | 2400 | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | przeniesiony |
| `transition.hex-wipe` | transition | Fala heksagonów | Canvas 2D | accent | — | 2600 | T1 | S | — | J.on("fx") — zmiana poziomu J.fx.level() | przeniesiony |
| `transition.ink` | transition | Atrament | Canvas 2D, SVG, SVG filter | accent | — | 3000 | T1 | S | — | J.emit("thread") — wyczyszczenie wątku | przeniesiony |
| `transition.zoom-through` | transition | Przelot przez kulę | Canvas 2D, scene transform (WAAPI), DOM/WAAPI | hero | — | 2400 | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | przeniesiony |

## `02-engine-effects` — Efekty silnika (35)

| id | rodzina | tytuł | technika | waga | minQ | czas | tier | wys. | zależności | zdarzenie w aplikacji | status |
|---|---|---|---|---|---|---:|---|---|---|---|---|
| `ambient.flare` | screen | ambient.flare | Effect Engine (DOM/WAAPI/Canvas) | — | high | — | T2 | S | — | J.ev "task.created" | do-przeniesienia |
| `ambient.meteors` | screen | ambient.meteors | Effect Engine (DOM/WAAPI/Canvas) | — | high | 1200 | T2 | S | — | J.ev "task.completed" | do-przeniesienia |
| `boot.sequence` | actions | boot.sequence | Effect Engine (DOM/WAAPI/Canvas) | — | low | 1800 | T2 | S | — | koniec bootu w main.js → J.emit("app-view","booted") | do-przeniesienia |
| `click.ripple` | screen | click.ripple | Effect Engine (DOM/WAAPI/Canvas) | — | low | 700 | T2 | S | — | pointermove na #fxlayer | do-przeniesienia |
| `command.launch` | actions | command.launch | Effect Engine (DOM/WAAPI/Canvas) | — | low | 800 | T2 | S | — | J.emit("thread") — nowa wiadomość użytkownika | do-przeniesienia |
| `energy.arc` | links | energy.arc | Effect Engine (DOM/WAAPI/Canvas) | — | high | 560 | T2 | S | — | J.ev "tool.completed" | do-przeniesienia |
| `fly.to` | actions | fly.to | Effect Engine (DOM/WAAPI/Canvas) | — | low | 1300 | T2 | S | — | J.emit("tasks") + adapter | do-przeniesienia |
| `holo.confetti` | particles | holo.confetti | Effect Engine (DOM/WAAPI/Canvas) | — | ultra | 2300 | T2 | S | — | J.ev "task.completed" | do-przeniesienia |
| `keycap.hint` | actions | keycap.hint | Effect Engine (DOM/WAAPI/Canvas) | — | low | 1100 | T2 | S | — | J.on("shortcuts") | do-przeniesienia |
| `line.flow` | graph | line.flow | Effect Engine (DOM/WAAPI/Canvas) | — | high | 950 | T2 | S | — | J.ev "tool.started" | do-przeniesienia |
| `line.return` | links | line.return | Effect Engine (DOM/WAAPI/Canvas) | — | high | 850 | T2 | S | — | J.ev "tool.completed" | do-przeniesienia |
| `node.flash` | graph | node.flash | Effect Engine (DOM/WAAPI/Canvas) | — | low | 700 | T2 | S | — | J.ev "tool.started" | do-przeniesienia |
| `node.scan` | links | node.scan | Effect Engine (DOM/WAAPI/Canvas) | — | high | 1000 | T2 | S | — | J.ev "tool.started" | do-przeniesienia |
| `node.sparks` | links | node.sparks | Effect Engine (DOM/WAAPI/Canvas) | — | high | 900 | T2 | S | — | J.ev "tool.started" | do-przeniesienia |
| `orb.burst` | orb | orb.burst | Effect Engine (DOM/WAAPI/Canvas) | — | low | 1300 | T2 | S | — | J.ev "task.completed" | do-przeniesienia |
| `orb.charge` | orb | orb.charge | Effect Engine (DOM/WAAPI/Canvas) | — | low | 700 | T2 | S | — | J.ev "task.created" | do-przeniesienia |
| `orb.energy` | orb | orb.energy | Effect Engine (DOM/WAAPI/Canvas) | — | high | — | T2 | S | — | J.ev "task.created" | do-przeniesienia |
| `orb.error` | orb | orb.error | Effect Engine (DOM/WAAPI/Canvas) | — | low | 1500 | T2 | S | — | J.ev "task.failed" | do-przeniesienia |
| `orb.flicker` | orb | orb.flicker | Effect Engine (DOM/WAAPI/Canvas) | — | high | — | T2 | S | — | J.ev "model.started" (próbki fali co 90 ms) | do-przeniesienia |
| `orb.inhale` | particles | orb.inhale | Effect Engine (DOM/WAAPI/Canvas) | — | high | 1000 | T2 | S | — | J.ev "task.created" | do-przeniesienia |
| `orb.ping` | particles | orb.ping | Effect Engine (DOM/WAAPI/Canvas) | — | high | 650 | T2 | S | — | J.ev "model.started" | do-przeniesienia |
| `orb.shockwave` | particles | orb.shockwave | Effect Engine (DOM/WAAPI/Canvas) | — | low | 1400 | T2 | S | — | J.ev "task.created" | do-przeniesienia |
| `orb.think` | actions | orb.think | Effect Engine (DOM/WAAPI/Canvas) | — | low | 20 | T2 | S | — | J.ev "approval.requested" / "task.paused" | do-przeniesienia |
| `orb.wake` | actions | orb.wake | Effect Engine (DOM/WAAPI/Canvas) | — | low | 900 | T2 | S | — | visibilitychange → J.emit("app-view") | do-przeniesienia |
| `panel.sweep` | screen | panel.sweep | Effect Engine (DOM/WAAPI/Canvas) | — | high | 1200 | T2 | S | — | J.ev "task.completed" | do-przeniesienia |
| `ripple.burst` | graph | ripple.burst | Effect Engine (DOM/WAAPI/Canvas) | — | high | 1700 | T2 | S | — | J.ev "task.completed" | do-przeniesienia |
| `screen.brackets` | actions | screen.brackets | Effect Engine (DOM/WAAPI/Canvas) | — | low | 1300 | T2 | S | — | fullscreenchange | do-przeniesienia |
| `screen.edge` | actions | screen.edge | Effect Engine (DOM/WAAPI/Canvas) | — | low | 1800 | T2 | S | — | online/offline + J.on("signal") | do-przeniesienia |
| `screen.flash` | screen | screen.flash | Effect Engine (DOM/WAAPI/Canvas) | — | low | 900 | T2 | S | — | J.ev "task.completed" | do-przeniesienia |
| `screen.glitch` | screen | screen.glitch | Effect Engine (DOM/WAAPI/Canvas) | — | high | 600 | T2 | S | — | J.ev "task.failed" | do-przeniesienia |
| `screen.sweep` | actions | screen.sweep | Effect Engine (DOM/WAAPI/Canvas) | — | low | 1000 | T2 | S | — | J.on("fx") — zmiana poziomu J.fx.level() | do-przeniesienia |
| `screen.vignette` | screen | screen.vignette | Effect Engine (DOM/WAAPI/Canvas) | — | low | 1400 | T2 | S | — | J.ev "task.failed" | do-przeniesienia |
| `sound.waves` | actions | sound.waves | Effect Engine (DOM/WAAPI/Canvas) | — | low | 1100 | T2 | S | — | J.on("settings") | do-przeniesienia |
| `target.ping` | actions | target.ping | Effect Engine (DOM/WAAPI/Canvas) | — | low | 1000 | T2 | S | — | J.emit("tasks") + adapter (zmiana flagi) | do-przeniesienia |
| `token.stream` | links | token.stream | Effect Engine (DOM/WAAPI/Canvas) | — | high | 750 | T2 | S | — | J.ev "model.started" (próbki fali co 90 ms) | do-przeniesienia |

## `03-studio-visuals` — Wizualizacje FX Studio (236)

| id | rodzina | tytuł | technika | waga | minQ | czas | tier | wys. | zależności | zdarzenie w aplikacji | status |
|---|---|---|---|---|---|---:|---|---|---|---|---|
| `ambient.aurora-drift` | ambient | Aurora drift | css | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `ambient.aurora-storm` | ambient | Aurora storm | css | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `ambient.biolume` | ambient | Bioluminescence | canvas | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `ambient.caustics` | ambient | Water caustics | css | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `ambient.cloud-shadow` | ambient | Cloud shadow pass | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `ambient.dust-motes` | ambient | Dust motes | canvas | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `ambient.fog-roll` | ambient | Fog roll | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `ambient.godrays` | ambient | God rays | css | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `ambient.grid-breathe` | ambient | Grid breathe | css | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `ambient.heat-haze` | ambient | Heat haze | filter | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `ambient.horizon-glow` | ambient | Horizon glow | css | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `ambient.lake-ripple` | ambient | Lake ripple | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `ambient.lightning` | ambient | Distant lightning | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `ambient.moon-halo` | ambient | Moon halo | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `ambient.nebula` | ambient | Nebula bloom | css | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `ambient.parallax-stars` | ambient | Parallax stars | canvas | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `ambient.rain-glass` | ambient | Rain on glass | canvas | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `ambient.scan-atmosphere` | ambient | Atmospheric scan | css | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `ambient.twinkle` | ambient | Star twinkle | canvas | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `ambient.wind-streaks` | ambient | Wind streaks | canvas | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `data.bar-race` | data | Bar race | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `data.cost-pulse` | data | Cost pulse | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `data.counter-slam` | data | Counter slam | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `data.diff-highlight` | data | Diff highlight | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `data.donut-spin` | data | Donut spin | svg | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `data.gauge-needle` | data | Gauge needle | svg | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `data.heatmap-flicker` | data | Heatmap flicker | canvas | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `data.hex-dump` | data | Hex dump scroll | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `data.json-tree` | data | JSON tree expand | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `data.kpi-pop` | data | KPI pop sequence | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `data.log-waterfall` | data | Log waterfall | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `data.queue-drain` | data | Queue drain | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `data.spark-grid` | data | Spark grid | canvas | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `data.throughput` | data | Throughput river | canvas | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `data.timeline-scrub` | data | Timeline scrub | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `data.token-meter` | data | Token meter fill | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `engine.ambient-meteors` | engine | Engine meteors | engine | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `engine.boot-sequence` | engine | Boot sequence | engine | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `engine.holo-confetti` | engine | Engine holo confetti | engine | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `engine.keycap-hint` | engine | Keycap hint | engine | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `engine.orb-burst` | engine | Orb burst | engine | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `engine.orb-charge` | engine | Orb charge | engine | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `engine.orb-error` | engine | Orb error | engine | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `engine.orb-inhale` | engine | Orb inhale | engine | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `engine.orb-shockwave` | engine | Orb shockwave | engine | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `engine.orb-think` | engine | Orb think | engine | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `engine.orb-wake` | engine | Orb wake | engine | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `engine.screen-glitch` | engine | Engine screen glitch | engine | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `glitch.block-corrupt` | glitch | Block corrupt | canvas | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `glitch.checksum` | glitch | Checksum fail | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `glitch.datamosh` | glitch | Datamosh smear | filter | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `glitch.dropout` | glitch | Signal dropout | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `glitch.error-stamp` | glitch | ERROR stamp | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `glitch.invert-flash` | glitch | Invert flash | filter | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `glitch.jitter` | glitch | Jitter shake | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `glitch.kernel-panic` | glitch | Kernel panic | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `glitch.recovery` | glitch | Recovery blink | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `glitch.red-alert` | glitch | Red alert strobe | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `glitch.rgb-split` | glitch | RGB split | filter | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `glitch.slice-shift` | glitch | Slice shift | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `glitch.stack-trace` | glitch | Stack trace rain | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `glitch.static` | glitch | TV static | canvas | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `glitch.tear` | glitch | Screen tear | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `glitch.wire-spark` | glitch | Wire spark fail | canvas | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `hud.altitude-tape` | hud | Altitude tape | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `hud.badge-stamp` | hud | Badge stamp | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `hud.battery-fill` | hud | Battery fill | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `hud.chevron-flow` | hud | Chevron flow | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `hud.chip-shine` | hud | Chip shine pass | css | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `hud.compass-spin` | hud | Compass spin | svg | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `hud.crosshair-draw` | hud | Crosshair draw | gsap | — | — | — | T3 | — | `gsap` | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `hud.eq-bars` | hud | EQ bars | canvas | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `hud.fps-sparkline` | hud | FPS sparkline | canvas | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `hud.grid-perspective` | hud | Perspective grid rise | css | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `hud.heading-tape` | hud | Heading tape | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `hud.hologram-flicker` | hud | Hologram flicker | filter | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `hud.latency-graph` | hud | Latency graph | canvas | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `hud.lock-brackets` | hud | Lock brackets | gsap | — | — | — | T3 | — | `gsap` | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `hud.map-ping` | hud | Map ping | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `hud.pip-window` | hud | PIP window open | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `hud.progress-arc` | hud | Progress arc | svg | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `hud.progress-seg` | hud | Segmented progress | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `hud.radar-blips` | hud | Radar blips | canvas | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `hud.radar-sweep` | hud | Radar sweep | canvas | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `hud.reticle-lock` | hud | Reticle lock-on | svg | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `hud.reticle-pulse` | hud | Reticle pulse | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `hud.signal-bars` | hud | Signal bars | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `hud.status-cascade` | hud | Status cascade | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `hud.target-box` | hud | Target box chase | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `hud.telemetry-scroll` | hud | Telemetry scroll | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `hud.tick-marks` | hud | Tick marks spin | svg | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `hud.waveform-live` | hud | Waveform live | canvas | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `orb.beacon` | orb | Orb beacon | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `orb.charge-spiral` | orb | Orb charge spiral | canvas | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `orb.dna-orbit` | orb | Orb DNA orbit | canvas | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `orb.echo` | orb | Orb echo | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `orb.eclipse` | orb | Orb eclipse | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `orb.ember-halo` | orb | Orb ember halo | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `orb.hex-core` | orb | Orb hex core | svg | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `orb.ice-halo` | orb | Orb ice halo | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `orb.iris-lock` | orb | Orb iris lock | svg | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `orb.magnetar` | orb | Orb magnetar | canvas | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `orb.plasma` | orb | Orb plasma boil | canvas | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `orb.prism` | orb | Orb prism split | filter | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `orb.pulse-hard` | orb | Orb hard pulse | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `orb.pulse-soft` | orb | Orb soft pulse | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `orb.quark` | orb | Orb quark jitter | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `orb.ring-expand` | orb | Orb ring expand | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `orb.scan-lat` | orb | Orb latitude scan | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `orb.segment-spin` | orb | Orb segment spin | svg | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `orb.sonar` | orb | Orb sonar ping | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `orb.violet-nova` | orb | Orb violet nova | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `orb.wake-trail` | orb | Orb wake trail | gsap | — | — | — | T3 | — | `gsap` | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `orb.wireframe` | orb | Orb wireframe bloom | svg | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `particles.ash` | particles | Ash fall | canvas | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `particles.bubbles` | particles | Underwater bubbles | canvas | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `particles.confetti-gold` | particles | Gold confetti | canvas | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `particles.confetti-holo` | particles | Holo confetti | canvas | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `particles.constellation` | particles | Constellation draw | canvas | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `particles.data-bits` | particles | Data bits stream | canvas | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `particles.embers` | particles | Embers drift | canvas | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `particles.energy-arcs` | particles | Energy micro-arcs | canvas | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `particles.fireflies` | particles | Fireflies | canvas | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `particles.fountain` | particles | Particle fountain | canvas | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `particles.glyphs` | particles | Floating glyphs | canvas | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `particles.hex-packets` | particles | Hex packets | canvas | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `particles.meteors-cross` | particles | Meteors cross | canvas | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `particles.nodes-connect` | particles | Nodes connect | canvas | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `particles.nova-debris` | particles | Nova debris | canvas | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `particles.orbit-motes` | particles | Orbit motes | canvas | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `particles.photon-burst` | particles | Photon burst | canvas | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `particles.pixel-swarm` | particles | Pixel swarm | canvas | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `particles.pollen` | particles | Pollen float | canvas | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `particles.rain-neon` | particles | Neon rain | canvas | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `particles.ribbon` | particles | Ribbon trail | canvas | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `particles.shock-dust` | particles | Shock dust ring | canvas | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `particles.snow` | particles | Soft snow | canvas | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `particles.sparks-burst` | particles | Sparks burst | canvas | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `particles.sparks-up` | particles | Sparks rising | canvas | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `particles.stardust` | particles | Stardust swirl | canvas | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `particles.token-droplets` | particles | Token droplets | canvas | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `particles.vortex` | particles | Particle vortex | canvas | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `pointer.drag-ghost` | pointer | Drag ghost | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `pointer.focus-beam` | pointer | Focus beam | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `pointer.hover-lift` | pointer | Hover lift field | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `pointer.lasso` | pointer | Lasso select | svg | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `pointer.long-press` | pointer | Long-press ring | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `pointer.magnet` | pointer | Magnet pull | gsap | — | — | — | T3 | — | `gsap` | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `pointer.pinch` | pointer | Pinch zoom hint | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `pointer.ripple` | pointer | Click ripple | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `pointer.ripple-double` | pointer | Double ripple | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `pointer.spark-click` | pointer | Spark click | canvas | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `pointer.swipe` | pointer | Swipe sheet | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `pointer.trail` | pointer | Cursor trail | canvas | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `screen.blur-shock` | screen | Screen blur shock | filter | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `screen.code-rain` | screen | Screen code rain | canvas | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `screen.color-grade-cold` | screen | Screen cold grade | filter | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `screen.color-grade-warm` | screen | Screen warm grade | filter | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `screen.corner-brackets` | screen | Screen corner brackets | gsap | — | — | — | T3 | — | `gsap` | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `screen.crt-off` | screen | Screen CRT power-off | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `screen.crt-on` | screen | Screen CRT power-on | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `screen.edge-ok` | screen | Screen edge online | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `screen.edge-warn` | screen | Screen edge warning | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `screen.flash-cyan` | screen | Screen cyan flash | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `screen.flash-rose` | screen | Screen rose flash | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `screen.flash-white` | screen | Screen white flash | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `screen.hud-boot-grid` | screen | Screen HUD boot grid | svg | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `screen.letterbox` | screen | Screen letterbox | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `screen.pixelate` | screen | Screen pixelate | filter | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `screen.scanline-fast` | screen | Screen fast scanlines | css | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `screen.scanline-slow` | screen | Screen slow scan | css | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `screen.shatter` | screen | Screen shatter glass | svg | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `screen.vignette-pulse` | screen | Screen vignette pulse | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `screen.wipe-ltr` | screen | Screen wipe L→R | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `screen.wipe-radial` | screen | Screen radial wipe | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `screen.wipe-rtl` | screen | Screen wipe R→L | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `success.checkmark-draw` | success | Checkmark draw | svg | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `success.chorus-bars` | success | Chorus bars | canvas | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `success.flare-up` | success | Flare up | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `success.level-up` | success | Level up | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `success.medal` | success | Medal drop | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `success.orbit-cheer` | success | Orbit cheer | canvas | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `success.prism-burst` | success | Prism burst | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `success.quiet-nod` | success | Quiet nod | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `success.ribbon-cut` | success | Ribbon cut | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `success.ring-burst` | success | Ring burst | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `success.shockwave` | success | Success shockwave | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `success.soft-bloom` | success | Soft bloom | filter | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `success.stamp-done` | success | DONE stamp | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `success.wave-salute` | success | Wave salute | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `text.binary-to-ascii` | text | Binary→ASCII | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `text.blur-reveal` | text | Blur reveal | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `text.caret-storm` | text | Caret storm | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `text.clip-reveal` | text | Clip reveal | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `text.countdown` | text | Countdown 3-2-1 | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `text.decode` | text | Decode glyphs | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `text.glitch-text` | text | Glitch text RGB | css | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `text.karaoke` | text | Karaoke highlight | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `text.mirror-split` | text | Mirror split text | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `text.neon-flicker` | text | Neon flicker sign | css | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `text.outline-draw` | text | Outline draw text | svg | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `text.scramble` | text | Scramble settle | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `text.stamp-classified` | text | Stamp CLASSIFIED | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `text.subtitle-in` | text | Subtitle slide | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `text.typewriter` | text | Typewriter | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `text.wave-chars` | text | Wave characters | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `transition.cards-shuffle` | transition | Cards shuffle | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `transition.crossfade` | transition | Crossfade | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `transition.cube-spin` | transition | Cube spin | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `transition.door-open` | transition | Door open | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `transition.elevator` | transition | Elevator rise | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `transition.iris-in` | transition | Iris in | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `transition.iris-out` | transition | Iris out | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `transition.match-cut` | transition | Match cut flash | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `transition.morph-blob` | transition | Morph blob | svg | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `transition.page-curl` | transition | Page curl | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `transition.tunnel` | transition | Light tunnel | canvas | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `transition.zoom-through` | transition | Zoom through | waapi | — | — | — | T4 | — | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `widget.badge-pop` | widget | Badge pop | css | — | — | — | T4 | — | — | J.on("app-view") — otwarcie panelu | do-przeniesienia |
| `widget.bell-shake` | widget | Bell shake | css | — | — | — | T4 | — | — | J.on("app-view") — otwarcie panelu | do-przeniesienia |
| `widget.chat-launch` | widget | Command launch | engine | — | — | — | T4 | — | — | J.on("app-view") — otwarcie panelu | do-przeniesienia |
| `widget.chat-sweep` | widget | Chat panel sweep | engine | — | — | — | T4 | — | — | J.on("app-view") — otwarcie panelu | do-przeniesienia |
| `widget.clock-roll` | widget | Clock digit roll | waapi | — | — | — | T4 | — | — | J.on("app-view") — otwarcie panelu | do-przeniesienia |
| `widget.dock-magnify` | widget | Dock magnify burst | css | — | — | — | T4 | — | — | J.on("app-view") — otwarcie panelu | do-przeniesienia |
| `widget.fly-note` | widget | Fly to notes | engine | — | — | — | T4 | — | — | J.on("app-view") — otwarcie panelu | do-przeniesienia |
| `widget.fly-schedule` | widget | Fly to schedule | engine | — | — | — | T4 | — | — | J.on("app-view") — otwarcie panelu | do-przeniesienia |
| `widget.fly-tokens` | widget | Fly to tokens | engine | — | — | — | T4 | — | — | J.on("app-view") — otwarcie panelu | do-przeniesienia |
| `widget.log-expand` | widget | Log expand glow | waapi | — | — | — | T4 | — | — | J.on("app-view") — otwarcie panelu | do-przeniesienia |
| `widget.mute-waves` | widget | Mute sound waves | engine | — | — | — | T4 | — | — | J.on("app-view") — otwarcie panelu | do-przeniesienia |
| `widget.note-stack` | widget | Note stack shuffle | waapi | — | — | — | T4 | — | — | J.on("app-view") — otwarcie panelu | do-przeniesienia |
| `widget.pin-spin` | widget | Pin spin | waapi | — | — | — | T4 | — | — | J.on("app-view") — otwarcie panelu | do-przeniesienia |
| `widget.quality-pill` | widget | Quality pill slide | waapi | — | — | — | T4 | — | — | J.on("app-view") — otwarcie panelu | do-przeniesienia |
| `widget.schedule-check` | widget | Schedule check draw | svg | — | — | — | T4 | — | — | J.on("app-view") — otwarcie panelu | do-przeniesienia |
| `widget.tile-ping` | widget | Tile ping | engine | — | — | — | T4 | — | — | J.on("app-view") — otwarcie panelu | do-przeniesienia |
| `widget.toast-slide` | widget | Toast slide in | waapi | — | — | — | T4 | — | — | J.on("app-view") — otwarcie panelu | do-przeniesienia |
| `widget.weather-spin` | widget | Weather icon spin | css | — | — | — | T4 | — | — | J.on("app-view") — otwarcie panelu | do-przeniesienia |

## `04-css-animations` — Animacje CSS (46)

| id | rodzina | tytuł | technika | waga | minQ | czas | tier | wys. | zależności | zdarzenie w aplikacji | status |
|---|---|---|---|---|---|---:|---|---|---|---|---|
| `alert-blink` | css | @keyframes alert-blink | CSS (1 @keyframes) | — | — | — | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `aurora-drift` | css | @keyframes aurora-drift | CSS (1 @keyframes) | — | — | — | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `badge-pop` | css | @keyframes badge-pop | CSS (1 @keyframes) | — | — | — | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `beam-flicker` | css | @keyframes beam-flicker | CSS (1 @keyframes) | — | — | — | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `beam-rise` | css | @keyframes beam-rise | CSS (1 @keyframes) | — | — | — | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `bell-ring` | css | @keyframes bell-ring | CSS (1 @keyframes) | — | — | — | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `boot-down` | css | @keyframes boot-down | CSS (1 @keyframes) | — | — | — | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `boot-left` | css | @keyframes boot-left | CSS (1 @keyframes) | — | — | — | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `boot-right` | css | @keyframes boot-right | CSS (1 @keyframes) | — | — | — | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `boot-up` | css | @keyframes boot-up | CSS (1 @keyframes) | — | — | — | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `border-spin` | css | @keyframes border-spin | CSS (1 @keyframes) | — | — | — | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `caret-blink` | css | @keyframes caret-blink | CSS (1 @keyframes) | — | — | — | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `caustic` | css | @keyframes caustic | CSS (1 @keyframes) | — | — | — | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `caustic-fade` | css | @keyframes caustic-fade | CSS (1 @keyframes) | — | — | — | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `dash-flow` | css | @keyframes dash-flow | CSS (1 @keyframes) | — | — | — | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `fade-in` | css | @keyframes fade-in | CSS (1 @keyframes) | — | — | — | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `fade-up` | css | @keyframes fade-up | CSS (1 @keyframes) | — | — | — | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `float` | css | @keyframes float | CSS (1 @keyframes) | — | — | — | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `glitch-a` | css | @keyframes glitch-a | CSS (1 @keyframes) | — | — | — | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `glitch-b` | css | @keyframes glitch-b | CSS (1 @keyframes) | — | — | — | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `header-glint` | css | @keyframes header-glint | CSS (1 @keyframes) | — | — | — | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `heartbeat` | css | @keyframes heartbeat | CSS (1 @keyframes) | — | — | — | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `log-in` | css | @keyframes log-in | CSS (1 @keyframes) | — | — | — | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `msg-in` | css | @keyframes msg-in | CSS (1 @keyframes) | — | — | — | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `node-in` | css | @keyframes node-in | CSS (1 @keyframes) | — | — | — | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `pop-in` | css | @keyframes pop-in | CSS (1 @keyframes) | — | — | — | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `pulse-dot` | css | @keyframes pulse-dot | CSS (1 @keyframes) | — | — | — | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `pulse-glow` | css | @keyframes pulse-glow | CSS (1 @keyframes) | — | — | — | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `ring-breathe` | css | @keyframes ring-breathe | CSS (1 @keyframes) | — | — | — | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `ripple` | css | @keyframes ripple | CSS (1 @keyframes) | — | — | — | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `scan-sweep` | css | @keyframes scan-sweep | CSS (1 @keyframes) | — | — | — | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `screen-glitch` | css | @keyframes screen-glitch | CSS (1 @keyframes) | — | — | — | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `send-in` | css | @keyframes send-in | CSS (1 @keyframes) | — | — | — | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `shimmer` | css | @keyframes shimmer | CSS (1 @keyframes) | — | — | — | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `spin-ccw` | css | @keyframes spin-ccw | CSS (1 @keyframes) | — | — | — | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `spin-cw` | css | @keyframes spin-cw | CSS (1 @keyframes) | — | — | — | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `studio-aurora` | css | @keyframes studio-aurora | CSS (1 @keyframes) | — | — | — | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `studio-beam` | css | @keyframes studio-beam | CSS (1 @keyframes) | — | — | — | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `studio-meteor-fall` | css | @keyframes studio-meteor-fall | CSS (1 @keyframes) | — | — | — | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `studio-scan-move` | css | @keyframes studio-scan-move | CSS (1 @keyframes) | — | — | — | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `toast-timer` | css | @keyframes toast-timer | CSS (1 @keyframes) | — | — | — | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `typing-dot` | css | @keyframes typing-dot | CSS (1 @keyframes) | — | — | — | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `wave-bar` | css | @keyframes wave-bar | CSS (1 @keyframes) | — | — | — | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `wobble` | css | @keyframes wobble | CSS (1 @keyframes) | — | — | — | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `wx-drift` | css | @keyframes wx-drift | CSS (1 @keyframes) | — | — | — | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `wx-rain` | css | @keyframes wx-rain | CSS (1 @keyframes) | — | — | — | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |

## `05-motion-ui` — Ruch w UI (Motion) (22)

| id | rodzina | tytuł | technika | waga | minQ | czas | tier | wys. | zależności | zdarzenie w aplikacji | status |
|---|---|---|---|---|---|---:|---|---|---|---|---|
| `chat-panel` | panels | Ruch w chat-panel | Motion (React) | — | — | — | T3 | L | `lucide-react` `motion` | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `dock` | desktop | Ruch w dock | React | — | — | — | T3 | M | `lucide-react` | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `empty-state` | primitives | Ruch w empty-state | React | — | — | — | T3 | M | `lucide-react` | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `icon-tile` | primitives | Ruch w icon-tile | Motion (React) | — | — | — | T3 | M | `motion` | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `left-sidebar` | desktop | Ruch w left-sidebar | Motion (React) | — | — | — | T3 | M | `lucide-react` `motion` | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `manage-widget` | widgets | Ruch w manage-widget | Motion (React) | — | — | — | T3 | L | `lucide-react` `motion` | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `notes-widget` | widgets | Ruch w notes-widget | Motion (React) | — | — | — | T3 | M | `lucide-react` `motion` | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `orb` | stage | Ruch w orb | React | — | — | — | T3 | M | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `preview-stage` | panels | Ruch w preview-stage | React | — | — | — | T3 | L | `next` | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `process-graph` | stage | Ruch w process-graph | Motion (React) | — | — | — | T3 | L | `motion` | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `process-log` | panels | Ruch w process-log | Motion (React) | — | — | — | T3 | M | `lucide-react` `motion` | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `result-widget` | widgets | Ruch w result-widget | Motion (React) | — | — | — | T3 | M | `lucide-react` `motion` | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `schedule-widget` | widgets | Ruch w schedule-widget | Motion (React) | — | — | — | T3 | L | `lucide-react` `motion` | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `shell` | desktop | Ruch w shell | React | — | — | — | T3 | S | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `status-corners` | desktop | Ruch w status-corners | Motion (React) | — | — | — | T3 | L | `lucide-react` `motion` | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `studio-app` | studio | Ruch w studio-app | Motion (React) | — | — | — | T3 | L | `lenis` `lucide-react` `motion` `next` | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `swap-icon` | primitives | Ruch w swap-icon | Motion (React) | — | — | — | T3 | M | `motion` | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `toaster` | desktop | Ruch w toaster | Motion (React) | — | — | — | T3 | M | `lucide-react` `motion` | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `tokens-widget` | widgets | Ruch w tokens-widget | Motion (React) | — | — | — | T3 | M | `motion` | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `top-bar` | desktop | Ruch w top-bar | Motion (React) | — | — | — | T3 | L | `lucide-react` `motion` `next` | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `water-fx` | stage | Ruch w water-fx | React | — | — | — | T3 | S | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `widget-panel` | panels | Ruch w widget-panel | Motion (React) | — | — | — | T3 | M | `lucide-react` `motion` | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |

## `06-scenes` — Sceny i warstwy (10)

| id | rodzina | tytuł | technika | waga | minQ | czas | tier | wys. | zależności | zdarzenie w aplikacji | status |
|---|---|---|---|---|---|---:|---|---|---|---|---|
| `ambient-canvas` | 06-scenes | ambient-canvas | Canvas/WebGL | — | — | — | T3 | S | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `gsap-timeline` | 06-scenes | gsap-timeline | Canvas/WebGL | — | — | — | T3 | S | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `orb-stage` | 06-scenes | orb-stage | Canvas/WebGL | — | — | — | T3 | S | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `process-graph` | 06-scenes | process-graph | Canvas/WebGL | — | — | — | T3 | S | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `r3f-orb` | 06-scenes | r3f-orb | Canvas/WebGL | — | — | — | T3 | S | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `rive` | 06-scenes | rive | Canvas/WebGL | — | — | — | T3 | S | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `studio-overlays` | 06-scenes | studio-overlays | Canvas/WebGL | — | — | — | T3 | S | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `theatre-boot` | 06-scenes | theatre-boot | Canvas/WebGL | — | — | — | T3 | S | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `water-fx` | 06-scenes | water-fx | Canvas/WebGL | — | — | — | T3 | S | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `webgl-orb` | 06-scenes | webgl-orb | Canvas/WebGL | — | — | — | T3 | S | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |

## `07-primitives` — Prymitywy UI (9)

| id | rodzina | tytuł | technika | waga | minQ | czas | tier | wys. | zależności | zdarzenie w aplikacji | status |
|---|---|---|---|---|---|---:|---|---|---|---|---|
| `count-up` | 07-primitives | count-up | Motion (React) | — | — | — | T3 | M | `motion` | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `decode-text` | 07-primitives | decode-text | React | — | — | — | T3 | S | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `empty-state` | 07-primitives | empty-state | React | — | — | — | T3 | M | `lucide-react` | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `glass-panel` | 07-primitives | glass-panel | React | — | — | — | T3 | S | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `glow-filter` | 07-primitives | glow-filter | React | — | — | — | T3 | S | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `icon-button` | 07-primitives | icon-button | React | — | — | — | T3 | S | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `icon-tile` | 07-primitives | icon-tile | Motion (React) | — | — | — | T3 | M | `motion` | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `status-dot` | 07-primitives | status-dot | React | — | — | — | T3 | S | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `swap-icon` | 07-primitives | swap-icon | Motion (React) | — | — | — | T3 | M | `motion` | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |

## `08-audio` — Dźwięki UI (13)

| id | rodzina | tytuł | technika | waga | minQ | czas | tier | wys. | zależności | zdarzenie w aplikacji | status |
|---|---|---|---|---|---|---:|---|---|---|---|---|
| `chat.cleared` | audio | Dźwięk: chat.cleared | WebAudio (syntezowany, 4 nut) | — | — | — | T1 | S | — | J.emit("thread") — wyczyszczenie wątku | do-przeniesienia |
| `chat.message` | audio | Dźwięk: chat.message | WebAudio (syntezowany, 1 nut) | — | — | — | T1 | S | — | J.emit("thread") — nowa wiadomość użytkownika | do-przeniesienia |
| `node.completed` | audio | Dźwięk: node.completed | WebAudio (syntezowany, 17 nut) | — | — | — | T1 | S | — | J.ev "tool.completed" | do-przeniesienia |
| `note.added` | audio | Dźwięk: note.added | WebAudio (syntezowany, 8 nut) | — | — | — | T1 | S | — | J.emit("notes") + adapter (wzrost listy) | do-przeniesienia |
| `run.completed` | audio | Dźwięk: run.completed | WebAudio (syntezowany, 16 nut) | — | — | — | T1 | S | — | J.ev "task.completed" | do-przeniesienia |
| `run.failed` | audio | Dźwięk: run.failed | WebAudio (syntezowany, 12 nut) | — | — | — | T1 | S | — | J.ev "task.failed" | do-przeniesienia |
| `run.started` | audio | Dźwięk: run.started | WebAudio (syntezowany, 19 nut) | — | — | — | T1 | S | — | J.ev "task.created" | do-przeniesienia |
| `schedule.added` | audio | Dźwięk: schedule.added | WebAudio (syntezowany, 6 nut) | — | — | — | T1 | S | — | J.emit("tasks") + adapter | do-przeniesienia |
| `schedule.toggled` | audio | Dźwięk: schedule.toggled | WebAudio (syntezowany, 4 nut) | — | — | — | T1 | S | — | J.emit("tasks") + adapter (zmiana flagi) | do-przeniesienia |
| `setting.changed` | audio | Dźwięk: setting.changed | WebAudio (syntezowany, 3 nut) | — | — | — | T1 | S | — | J.on("settings") | do-przeniesienia |
| `widget.closed` | audio | Dźwięk: widget.closed | WebAudio (syntezowany, 9 nut) | — | — | — | T1 | S | — | brak — dźwięk odtwarzany przez J.sfx | do-przeniesienia |
| `widget.opened` | audio | Dźwięk: widget.opened | WebAudio (syntezowany, 10 nut) | — | — | — | T1 | S | — | J.on("app-view") — otwarcie panelu | do-przeniesienia |
| `widget.pinned` | audio | Dźwięk: widget.pinned | WebAudio (syntezowany, 4 nut) | — | — | — | T1 | S | — | J.emit("wm") — przypięcie | do-przeniesienia |

## `09-os-integration` — Integracja z Jarvis OS (6)

| id | rodzina | tytuł | technika | waga | minQ | czas | tier | wys. | zależności | zdarzenie w aplikacji | status |
|---|---|---|---|---|---|---:|---|---|---|---|---|
| `index.ts` | integration | index.ts | TypeScript (OS FX layer) | — | — | — | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `os-fx-browser.tsx` | integration | os-fx-browser.tsx | TypeScript (OS FX layer) | — | — | — | T3 | S | `lucide-react` | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `os-fx-layer.tsx` | integration | os-fx-layer.tsx | TypeScript (OS FX layer) | — | — | — | T1 | S | — | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `tools/fx-audit.mjs` | integration | tools/fx-audit.mjs | narzędzie Node | — | — | — | T3 | S | `@playwright/test` `node:fs` | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `tools/fx-catalog.mjs` | integration | tools/fx-catalog.mjs | narzędzie Node | — | — | — | T3 | S | `node:fs` `node:path` | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
| `tools/fx-frames.mjs` | integration | tools/fx-frames.mjs | narzędzie Node | — | — | — | T3 | S | `@playwright/test` `node:fs` `node:path` `node:url` | wymaga ręcznego przypisania (Faza 8) | do-przeniesienia |
