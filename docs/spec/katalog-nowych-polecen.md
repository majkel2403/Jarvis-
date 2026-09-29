# Katalog planowanych poleceń (wygenerowany z docs/spec/nowe-polecenia.js)

> Generuje `node tools/gen-spec.js`. Źródło: `docs/spec/nowe-polecenia.js`. Szczegóły w dokumencie z kolumny „opis w”. „rozszerzenie” = polecenie już istnieje, zmieniają się argumenty.

Planowanych: **1** (nowych 1, rozszerzeń 0). Po wdrożeniu rejestr będzie miał ok. 123 poleceń.

| fala | liczba |
|---|---|
| W1 | 0 |
| W2 | 0 |
| W3 | 0 |
| W4 | 0 |
| W5 | 1 |

## Interfejs

| id | co robi | argumenty | poziom | cofanie | fala | opis w | przykłady PL |
|---|---|---|---|---|---|---|---|
| `fx_level` | Poziom efektów — Efekty: tool (oszczędnie), standard, cinema (pełne); off = bez animacji. | **level**: off\|tool\|standard\|cinema | A2 | poprzedni poziom | W5 | [09-wyglad-stany.md](09-wyglad-stany.md) | „wyłącz animacje”, „tryb kinowy”, „mniej efektów” |

