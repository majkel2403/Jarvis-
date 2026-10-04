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

## Dostępne workflow

| Workflow | Wejście | Co powstaje | Autonomia |
|---|---|---|---|
| `od-pomyslu-do-projektu` | `pomysl` | `%USERPROFILE%\JarvisWorkspace\projects\<nazwa>\`: README (brief), `docs/ARCHITEKTURA.md`, `docs/adr/0001-*.md`, `STRUKTURA.md`, szkielety plików, commit git; notatka na pulpicie | L3 |

## Jak dodać workflow

1. Nowy plik `workflows/<id>.yaml` (wzór: `od-pomyslu-do-projektu.yaml`), zgodny z `workflows/schema.json`.
2. Kroki: `hermes` (prompt z `{wejściem}` i `{wynikiem.pola}`, `format: json|text`, `check`), `check`, `write_files`, `tool`, `ask`.
   Każdy krok ze skutkami ma `effect` (`reversible` / `irreversible` / `external`) — od tego zależą pytania o zgodę.
3. `python bridge/test_workflows.py` sprawdza definicje z repo; most wczytuje zmienione pliki bez restartu.
