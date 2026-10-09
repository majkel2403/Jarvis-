# Wizualizacja sejfu (graf 3D) — przepis

Klasa zadania: „zrób graf / mapę drugiego mózgu”, „pokaż sejf wizualnie”. Sejf jest **tylko czytany**; skrypty, dane i frontend leżą poza nim (np. `C:\Users\majke\JarvisWorkspace\obsidian-graph\`), a w sejfie ląduje wyłącznie notatka o narzędziu (`04 - Resources/`) + wiersz w `log.md`/`hot.md`.

## 1. Dane — `build_graph.py`

- Wejście: `Path(VAULT).rglob("*.md")`. Wyklucz katalogi: `.obsidian`, `.trash`, `.vault-explorer`, `_attachments`, `_tools`, `Templates`, `.git`, `.smart-env` — inaczej graf zapełnia się szablonami i śmieciami.
- Kodowanie: próbuj `utf-8`, `utf-8-sig`, `cp1250`, `latin-1` po kolei.
- Krawędzie: wikilinki `\[\[([^\]|#]+)` plus zwykłe linki `](…)` do plików `.md`; cel rozwiązuj po nazwie pliku bez rozszerzenia, pomijaj `#nagłówki` i `|alias`.
- Węzeł: `id` = ścieżka relatywna, `label` = tytuł (nagłówek H1 albo nazwa pliku), `dir` = folder, `group` = **pierwszy człon ścieżki** (warstwa), `degree`, `words`, `size` (np. `sqrt(słów)`), `tags` z frontmattera, flaga `perplexity` dla `06-AI-Sessions/Perplexity/*`.
- Wyjście: `graph.json` z sekcją `meta` (`notes`, `links`, `groups`, `orphans`).
- **Typy pól w `graph.json` są niespójne — normalizuj je w powłoce, raz, przed technikami:** `tags` to napis JSON (`'["a","b"]'`) → `JSON.parse` z fallbackiem na split po przecinku; `words`, `degree`, `size` to **napisy** → `Number(x) || 0`; `date` bywa puste; `perplexity` to napis `"True"/"False"` → `String(x).toLowerCase() === 'true'`. Wstawienie napisu w działanie arytmetyczne daje `NaN` w skali układu i całe płótno znika bez jednego błędu w konsoli. **Zapis tylko tego jednego pliku** — żadnego `open(..., "w")` w ścieżce sejfu.
- Skala, która była prawdziwa (2026-10): 1967 notatek · 6709 połączeń · 29 warstw · 2 sieroty, z czego archiwum Perplexity to ~1850 notatek. Dlatego archiwum musi być **domyślnie ukryte** — inaczej żywy mózg tonie w starych rozmowach.

## 2. Frontend (`index.html`, statycznie)

- `3d-force-graph` + `three` pobrane **lokalnie** do `lib/` (`curl -sL` z unpkg) — strona działa bez internetu.
- Etykiety hubów (stopień ≥ 4) jako **własny overlay HTML**: absolutnie pozycjonowane `div`-y aktualizowane w pętli `requestAnimationFrame` z `Graph.graph2ScreenCoords(x,y,z)`; poza ekranem → `display:none`. Nie walcz ze sprite'ami/CSS2D biblioteki.
- Filtr warstw **przebudowuje dane** (`Graph.graphData({nodes, links})` z przefiltrowanego zbioru) — wygaszanie kolorów zostawia węzły klikalne i licznik przestaje zgadzać się z tym, co widać.
- Panel szczegółów: tytuł, folder, liczba słów i połączeń, tagi, klikalna lista sąsiadów (klik = zaznacz + doświetl + przesuń kamerę).
- Szukanie: frazy po `label`/`dir`/tagach, trafienia podświetlone i wypisane; „Tylko żywy mózg / Wszystko” jako dwa przyciski przełączające komplet warstw.
- Wszystkie teksty z sejfu wstawiaj przez `textContent` albo `esc()` (`& < > " '`) — tytuły i ścieżki to dane, nie HTML.

## 3. Serwowanie i weryfikacja

- Serwer: `python -m http.server 8899 --bind 127.0.0.1` uruchamiany w tle z parametrem `background: true` (inline `(… &)` w tym środowisku wraca z `exit -1`). Do katalogu dorzuć `serve.cmd`, który otwiera przeglądarkę i podnosi serwer — użytkownik odpala wtedy jedną ikoną.
- Dowód przed „gotowe”: (1) `curl` zasobów do `$TMPDIR` (index, `graph.json`, `lib/*`) — kod 23 przy zapisie do bieżącego katalogu zdarza się i nie oznacza awarii serwera; (2) sondy JS w przeglądarce: `window.__graphReady`, widoczność `#err`/`#loading`, liczba wierszy warstw, liczba **widocznych** etykiet, `#stats`; (3) `capture_screenshot()` + `vision_analyze` na **lokalnej ścieżce PNG**; (4) zrzut i liczby pokaż użytkownikowi na Telegramie (`MEDIA:<ścieżka>`).
- **Wiele stron weryfikuj headless, nie klikaniem:** `scripts/probe-headless.cjs` (w tym skillu, działa dla dowolnej lokalnej strony) ładuje listę URL-i w headless Edge po CDP, czeka na `window.__LAB.ready`, zbiera metryki (`errors`, `fps`, liczba canvasów) i zapisuje PNG 2×; `scripts/sprawdz-zrzuty.py` mierzy **wycięty środek** zrzutu (poza panelami HUD) i mówi „rysuje / PUSTO”.
- Progi środka, które się sprawdziły: `jasne% > 1,2` **i** `kolorów > 400` **i** `std > 14` → technika rysuje. Wyjątek: celowo rzadkie widoki (macierz sąsiedztwa, cienkie łuki) wypadają poniżej progu mimo poprawnego rysunku — taki przypadek rozstrzygaj `vision_analyze`, nie progiem.
- Headless WebGL wymaga flag `--enable-unsafe-swiftshader --use-gl=angle --use-angle=swiftshader`; port zdalnego debugowania musi być **< 65536** (wyższy kończy się „Cannot navigate to invalid URL”), a `Page.captureScreenshot(deviceScaleFactor: 2)` daje ostry PNG 1600×900 → 3200×1800.
- Zrzut podawaj **lokalną ścieżką** (`MEDIA:<ścieżka>`, `vision_analyze`), nigdy przez `http://127.0.0.1` — `vision_analyze` odrzuca adresy prywatne.
- Testy interakcji w kanwie: patrz `ui-component-proofing` → sekcja o canvas/WebGL (`window.__dev = {find, show}` zamiast klikania we współrzędnych).

## 4. Ślad w sejfie

Po zbudowaniu: notatka `04 - Resources/<nazwa>.md` (type: resource, jak uruchomić, jakie liczby są prawdziwe) + wiersz w `04 - Resources/Resources Hub.md` + wpis `CREATE` w `log.md` i punkt w `hot.md`. Bez tego następna sesja nie wie, że narzędzie istnieje i zbuduje je drugi raz. Przy wielu wariantach dodaj galerię `index.html` z miniaturami i `RAPORT.md` z metrykami, a w sejfie zapisz **jeden** wpis `CREATE` na cały zestaw — nie wpis per wariant.

## 5. Wiele technik naraz — jeden shell, wstrzykiwany kod

Klasa zadania: „zrób N zupełnie różnych podejść / grafów / wariantów wizualizacji”. Układ, który się sprawdził:

1. **Jeden shell = wspólna powłoka** (`t-shell.html`): dane, HUD, panel notatki z sąsiadami, szukanie, filtr warstw, tooltipy, licznik FPS i API `LAB.tech({id,title,desc,hints,mount(api)})`. Powłoka ładuje `graph.json` i ustawia `window.__LAB = {ready, errors, fps, nodes, links}` — sonda headless czeka na `ready`, a błędy techniki są widoczne bez otwierania konsoli. `ready` ustaw dopiero po `afterLoad` i po przygotowaniu `window.__LAB.nodes/links/groups`.
2. **Technika = wyłącznie wstrzykiwany kod** w markery `@@TITLE@@` / `<!-- @@TECH_CSS@@ -->` / `/* @@TECH_JS@@ */`. `build.py` asertuje, że **każdy marker występuje dokładnie raz** — brak markera albo dwa trafienia znaczą „technika nie wklejona / wklejona dwa razy”, a strona i tak się otworzy i wygląda poprawnie.
3. **Kontrakt techniki:** `mount(api)` zwraca `{frame, fit, key, dispose}`; `api` daje `data`, `three`, `canvas`, `label`, `glowSprite`, `softTexture`, `color`, `orbit`, `hover`, `select`, `tip`, `stat`, `toast`, `fail`. `meta/tNN-slug.json` (z `js`, `css`, `hints`) jest źródłem prawdy — strony buduj z meta, wielokrotnie, po każdej poprawce.
4. **Generator (MiniMax-M3, subskrypcja = bez kosztu API):** jeden obiekt JSON `{name, css, js}` na technikę. `max_tokens=64000` — **32000 ucinało się w połowie JSON-a**, bo tokeny rozumowania wliczają się do odpowiedzi; `finish_reason=length` rozwiązuj ponowieniem z krótszym/ostrzejszym briefem, nie podnoszeniem limitu w nieskończoność. 4–5 równoległych wywołań, każde 2–10 min; w briefie żądaj „bez planu i komentarzy, od razu JSON”, limit linii `js`/`css` i zakaz `import`/`require`/`fetch`/`eval`.
5. **Walidacja statyczna przed uruchomieniem:** dokładnie jedno `LAB.tech(`, brak zakazanych tokenów, `js` zapisany jako `.mjs` i sprawdzony `node --check`, liczba linii w budżecie. Łapie składnię; **nie łapie pustego płótna** (patrz niżej).
6. **Defekt naprawiaj, nie generuj drugi raz.** Poprawka układu to 1–12 linii w `repair.py` (patch na `meta/*.json` + przebudowa strony) — tańsza i pewniejsza niż kolejne 5 minut modelu, który zrobi to samo.

### 5.1 Playbook naprawczy dla generowanego kodu wizualizacji

Objawy z tej klasy zadań — każdy z **zerem błędów w konsoli**:

| Objaw | Przyczyna | Poprawka |
|---|---|---|
| Puste płótno, HUD liczy węzły | `frame` zdefiniowane, ale **nie zwrócone** w obiektcie hooków `mount` | dopisz `frame,` do zwracanego obiektu |
| Puste płótno WebGL, scena zbudowana | brak `t.render()` w pętli klatki | wołaj `render()` na końcu `frame` |
| Układ ucieka / „Invalid array length” | brak tłumienia i limitów; siatka komórek rośnie w nieskończoność | tłumij (`*0.85`), ogranicz prędkość **i** pozycję, ogranicz liczbę komórek siatki |
| Wszystko zgniecione w punkt | normalizacja po **maksimum** — kilku uciekinierów ściska resztę | normalizuj po **percentylu** (`p95` promieni), dopiero potem skaluj |
| Jednolita szara mgła, nic nie widać | `FogExp2.density` niedopasowana do skali sceny (0.0012 przy kamerze 900+) | density ~0.00035 przy takich odległościach albo mgła wyłączona |
| Świecąca biała plama | za duże sprite'y poświaty i za duże kule | poświata ~`26 + deg*1.6` przy skali `1.7 + sqrt(deg)*0.55` |
| Absurdalny FPS (20000) | licznik z różnicy dwóch klatek | licz FPS w **oknie czasowym** (≥0,5 s), nie z jednej klatki |
| Układ zapada się do punktu | odpychanie `k/(d²)` za słabe przy dużych odległościach, tłumienie wygrywa | deterministyczny układ na sferze (bloki grup w spirali złotego kąta) |

**Diagnoza „nic nie widać”, gdy kod wygląda dobrze:** nie zgaduj. Wystaw scenę do `window` w kopii roboczej (`cache/diag-*`) i odczytaj przez CDP bounding box geometrii (`scene.traverse` → `attributes.position`). Zakres `mn ≈ mx ≈ 0` = układ zapadnięty; `|p|` w tysiącach = eksplozja — dopiero to wskazuje właściwą poprawkę. Kontrola statyczna tego nie złapie, bo składnia jest poprawna.
