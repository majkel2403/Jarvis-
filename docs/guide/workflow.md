# Workflow — powtarzalne procesy pracy

Workflow to proces z góry rozpisany na kroki. Hermes myśli wewnątrz kroków, a silnik w moście pilnuje kolejności, sprawdza
każdy krok, ponawia go ze zmianą podejścia, liczy budżet i zapisuje stan (szczegóły: [ADR 0007](../adr/0007-silnik-workflow-w-moscie.md)).

## Jak uruchomić

- **Pulpit / głos:** „zrób projekt z pomysłu aplikacja do nawyków”, „od pomysłu do projektu: bot do przypomnień”,
  „uruchom workflow …”, „status workflow”, „stop wszystko”. Okno: „pokaż mapę pracy”.
- **Telegram:** to samo zdanie do Hermesa — uruchamia `workflow_run` (działa także bez otwartej karty).
- **Mapa pracy → „Nowy…”:** wybór workflow i dane wejściowe.

Postęp widać na żywo: karta przebiegu w czacie (✓ zrobione · ⟳ trwa · ⏸ czeka na Ciebie · ✗ błąd · ⤼ pominięte), Mapa pracy
(kroki, ponowienia ↻, czasy, oceny, oś czasu, historia), Orb i Process Log.

## Film (tryb kinowy workflow)

Przycisk **🎬 Film** w Mapie pracy albo zdanie „pokaż film”, „pokaż film z workflow”, „workflow jak film”
(polecenie `workflow_film`; samo „tryb kinowy” dalej ustawia poziom efektów). Przebieg na cały ekran jak scena z filmu:

- **na żywo**, gdy przebieg trwa (● REC): krótkie „poprzednio”, potem kamera śledzi bieżący krok; pytania przebiegu mają
  przyciski odpowiedzi na dolnym pasku;
- **z zapisu**, gdy przebieg się skończył (▶ ZAPIS): cały przebieg w ok. 1,5 min (minuta pracy Hermesa ≈ 3 s ekranu),
  ⏭ przewija do finału i napisów.

Sceny: otwarcie („Jarvis OS przedstawia”, tytuł, pomysł), zapalenie konstelacji kroków, plansza aktu dla każdego kroku,
uderzenie przy ukończeniu (błysk, fala, iskry, flara) i hologram z wynikiem, „Korekta kursu” przy poprawce, „Awaria” przy
porażce, finał z odjazdem kamery, napisy końcowe (projekt, pomysł, sceny z czasami, zapisane pliki, statystyki) i „Koniec”.
Ścieżka dźwiękowa jest syntezowana na żywo (🔊/🔇 albo klawisz M; startuje wyciszona, gdy dźwięki pulpitu są wyłączone);
przy włączonej mowie lektor czyta tytuły aktów. Esc zamyka. Poziom efektów „wyłączone” albo systemowe „ogranicz ruch”:
cięcia zamiast lotów kamery, bez wstrząsów i błysków, napisy końcowe do przewinięcia.
Kod: `js/workflow-cinema.js` (scena, reżyser zdarzeń, dźwięk), style `.cin-*` w `css/jarvis.css`.

## Dostępne workflow

| Workflow | Wejście | Co powstaje | Autonomia |
|---|---|---|---|
| `od-pomyslu-do-projektu` | `pomysl` | `%USERPROFILE%\JarvisWorkspace\projects\<nazwa>\`: README (brief), `docs/ARCHITEKTURA.md`, `docs/adr/0001-*.md`, `STRUKTURA.md`, szkielety plików, commit git; notatka na pulpicie | L3 |

## Jak dodać workflow

1. Nowy plik `workflows/<id>.yaml` (wzór: `od-pomyslu-do-projektu.yaml`), zgodny z `workflows/schema.json`.
2. Kroki: `hermes` (prompt z `{wejściem}` i `{wynikiem.pola}`, `format: json|text`, `check`), `check`, `write_files`, `tool`, `ask`.
   Każdy krok ze skutkami ma `effect` (`reversible` / `irreversible` / `external`) — od tego zależą pytania o zgodę.
3. `python bridge/test_workflows.py` sprawdza definicje z repo; most wczytuje zmienione pliki bez restartu.
