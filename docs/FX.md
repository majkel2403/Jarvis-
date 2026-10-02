# Warstwa efektów (`js/fx/`)

Warstwa animacji i efektów wizualnych przeniesiona z biblioteki `jarvis-efekty`
(`katalog/` + `zrodla/`). Zero zależności w runtime, zero bundlera, zero Reacta.

## Co tu jest

| Plik | Skąd | Rola |
|---|---|---|
| `draw.js`, `palettes.js`, `runtime.js` | `_runtime/*` (katalog 01) | Pomocnicze rysowanie, palety, `FxCtx` i oś czasu |
| `effects/*.js` (11 plików) | `katalog/01-signature-fx` | **64 efekty sygnaturowe** |
| `engine-dom.js`, `engine-core.js` | `_runtime/*` (katalog 02) | Renderer DOM i rdzeń silnika |
| `effects-engine/*.js` (6 plików) | `zrodla/effects/library` | **35 efektów silnika** |
| `quality.js` | adaptacja | Mapowanie na `J.fx` — jedyne źródło jakości |
| `targets.js` | adaptacja | Kotwice DOM, rozwiązywane leniwie |
| `clock.js` | adaptacja | Zegar zasilany pętlą główną, nie własnym rAF |
| `index.js` | adaptacja | Rejestr 64 efektów + API `J.fxLayer` |
| `bindings.js` | adaptacja | Tłumaczenie zdarzeń aplikacji na efekty |
| `engine-tokens.js` | adaptacja | Paleta CSS aplikacji pod nazwami biblioteki |
| `engine.js` | adaptacja | Host silnika + adaptery `Clock` / `EventBus` |
| `webgl-orb.js` | port `orb-scene.ts` | Kula WebGL2 **bez three.js** |
| `audio.js` | katalog 08 | 13 dźwięków przez `J.sfx` |
| `browser.js` | adaptacja | Przeglądarka efektów (aplikacja `fx`) |

Pliki oznaczone „adaptacja" piszemy ręcznie. Pozostałe są **generowane** przez
`tools/fx-port.mjs` i `tools/fx-css.mjs` — nie edytuj ich.

## Decyzje projektowe

| # | Decyzja | Dlaczego |
|---|---|---|
| D1 | Zero bundlera, zero zależności npm w runtime | `docs/TS-MIGRATION.md` (ścieżka C). Transpile TS→JS jednorazowo, wynik w repozytorium. |
| D2 | Efekty jako nakładka; wyjątek: kula ma **przełącznik** canvas ⇄ WebGL2 | Odwracalność. Nic z dotychczasowej grafiki nie zniknęło. |
| D3 | Jedyne źródło jakości to `J.fx` (`js/main.js:89`) | Tam już są 4 poziomy, autodetekcja FPS i `prefers-reduced-motion`. |
| D4 | Jedna pętla rAF — `J.fxLayer.frame(now)` wołane z `js/main.js` | Druga pętla zaburzyłaby pomiar FPS, na którym stoi autodetekcja jakości. |
| D5 | Własna warstwa `#fxlayer`, nie `#fx` i nie `#orbCanvas` | `#fx` jest czyszczony co klatkę w głównej pętli. |
| D6 | Prefiks `fx-` na wszystkich klasach i `@keyframes` | `jarvis.css` ma 28 globalnych `@keyframes`; biblioteka 46 kolejnych. |
| D7 | `#fxlayer` jest **rodzeństwem** `#app` | `#app[data-fx="off"]` wyłącza animacje wewnątrz siebie. |
| D8 | Nie tworzymy trzeciego busa ani drugiego `AudioContext` | `docs/spec/katalog-zdarzen.md` i §8 `09-wyglad-stany.md` są kontraktem. |

## Nazwy, których łatwo nie zrozumieć

**`J.fx` to NIE warstwa efektów.** `J.fx` od `js/main.js:89` to system poziomów
jakości (`rank()`, `level()`, `lower()`). Warstwa efektów to `J.fxLayer`.
`window.__jarvisOsFx` wskazuje na `J.fxLayer` — nazwa z biblioteki, żeby
instrukcje w README efektów działały bez zmian.

**`J.fxQuality.getQuality()` zwraca nazwy biblioteki** (`low`/`high`/`ultra`),
a `J.fx.level()` zwraca nazwy aplikacji (`tool`/`standard`/`cinema`). To dwie
różne listy, mapowane 1:1 — nie ta sama lista pod dwoma nazwami.

**`data-fxl` to bramki jakości animacji CSS.** `J.fx.apply()` ustawia je na
`#app` i `#fxlayer`. Osobny atrybut, bo `data-fx` na `#app` już znaczy „poziom
aplikacji” i jest używany przez `jarvis.css:858-861`.

## Regeneracja

```bash
node tools/fx-port.mjs        # 64 efekty + 35 definicji silnika → js/fx/
node tools/fx-port.mjs --check  # wariant do CI: kończy się 1, gdy pliki nieaktualne
node tools/fx-css.mjs         # 46 animacji CSS → css/fx.css
node tools/fx-inventory.mjs   # stan przeniesienia → docs/fx-inventory.md
```

`tools/fx-port.mjs` używa `tsc --noCheck` z `devDependencies`. TypeScript 7 to
natywny port Go (`tsgo`) i **nie ma** API `ts.transpileModule` — dlatego
wywołujemy CLI, a nie bibliotekę. Zero nowych zależności.

Status `przeniesiony` w inwentaryzacji jest wyliczany z plików w `js/fx/`,
nie wpisywany ręcznie — dokument nie rozjedzie się z rzeczywistością.

## Testy

```bash
node --test tests/unit/fx-*.test.js
```

| Plik | Co pilnuje |
|---|---|
| `fx-registry.test.js` | 64 efekty, unikalne id, wagi, brak własnej pętli |
| `fx-quality.test.js` | Mapowanie 1:1 na `J.fx`, `atLeast` na granicach |
| `fx-bindings.test.js` | Powiązania wskazują istniejące efekty, throttling, adaptery list |
| `fx-cleanup.test.js` | Scena wraca do bazy po każdym efekcie |
| `fx-inventory.test.js` | 441 pozycji, status zgodny z rejestrem |
| `fx-harness.js` | Atrapa DOM/Canvas/WebGL dla testów warstwy |

Warstwa **nie** wchodzi do `tests/harness.js` — tam nie ma DOM, a 64 efekty
czytają `getClientRects`, Canvas 2D i WAAPI.

## Audyt w przeglądarce

```bash
node tools/fx-audit.mjs                    # 64 efekty, zrzuty do docs/fx-shots/
node tools/fx-audit.mjs --only orb.supernova,text.decode --no-shots
```

Sprawdza to, czego nie da się sprawdzić w Node: czy efekt coś rysuje, czy
scena wraca do stanu bazowego (porównanie `filter`/`transform`/`opacity` na
`#app` i panelach), czy warstwa jest pusta i czy konsola jest czysta.
Błędy CORS do mostu Hermesa (127.0.0.1:8651) są liczone osobno — to stan
wyjściowy środowiska, nie warstwy.

## Ustawienia

| Ustawienie | Komenda | Wartości |
|---|---|---|
| Poziom efektów | `fx_level` | `off` · `tool` · `standard` · `cinema` (było) |
| Renderer kuli | `orb_renderer` | `canvas` · `webgl` (nowe) |
| Przeglądarka efektów | `fx_browse` | otwiera okno (nowe) |

Po zmianie komendy w rejestrze: `node bridge/export-tools.js` — pilnuje tego
`tests/unit/bridge.test.js`.

## Znane ograniczenia

- Pięć efektów silnika (`node.scan`, `node.sparks`, `energy.arc`, `line.return`,
  `token.stream`) kotwiczy się do `node:<id>`, a ten pulpit nie ma rejestru
  węzłów Process Logu. Cicho nic nie robią — biblioteka kończy pracę, gdy
  `targets.get()` zwraca `undefined`. `J.fxNodes.NODE_BY_ID` jest pusty
  świadomie; wypełnianie go danymi zmyślonymi włączyłoby efekty bez celu.
- `ambient.meteors` z silnika nie jest wpięty jako stałe tło — patrz decyzje
  otwarte w planie.
- Kula WebGL2 nie powstaje przy `fx_level` poniżej `standard` ani bez WebGL2
  w przeglądarce; `orb_renderer` wtedy zwraca `canvas` i zapisuje to
  w Process Logu.
