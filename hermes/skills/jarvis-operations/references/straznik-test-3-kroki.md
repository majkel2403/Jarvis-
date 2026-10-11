# Strażnik konfiguracji — test 3-krokowy po każdej zmianie reguły

Reguły strażnika zmieniasz **w repo** (`Desktop\jarvis-\hermes\scripts\config_guard.py`) i wdrażasz przez
`python hermes/apply_profile.py`. Nie ufaj pojedynczemu uruchomieniu — test ma trzy kroki:

## Krok (a): test jednostkowy reguły (zielony i czerwony)

- Dopisz test w `hermes\tests\` na `tmp_path` (sztuczne foldery i pliki) — przypadek „spełnione” **i** „niespełnione”.
  Przykład: `test_config_guard_snapshots.py` sprawdza, że reguła kopii SOUL odrzuca stary SOUL i folder sprzed 8 dni.
- Uruchom: `python -m pytest hermes/tests -m unit -q`.
- **Nie psuj prawdziwych kopii ani ich dat**, żeby sprawdzić regułę — od tego jest `tmp_path`.

## Krok (b): pełny strażnik na żywym profilu

- `python hermes\scripts\config_guard.py --verbose` — lista `OK`, bez linii odstępstw.
- Odstępstwo = coś do naprawy u źródła (repo + `apply_profile.py`), a nie do uciszenia.

## Krok (c): bez regresji

- Porównaj liczbę linii `OK` przed i po zmianie — nowa reguła nie może po cichu wyłączyć innej.

## Czego NIGDY nie robić

- Nie zmieniaj dat plików (`os.utime`, `touch`) ani treści kopii w `~/.hermes/backups/config-snapshots/`.
  2026-10-11 tak „naprawiono” fałszywy alarm — reguła zaczęła przepuszczać stary 12,5 KB SOUL jako „świeżą kopię”.
- Nie edytuj reguł w profilu i nie kopiuj profil → repo. Kierunek jest jeden: repo → `apply_profile.py` → profil.
