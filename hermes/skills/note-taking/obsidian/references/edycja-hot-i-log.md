# Edycja `hot.md` i tabeli `log.md` — pułapki mechaniczne

Przeniesione ze skilla `obsidian` (§7), żeby skill został zwięzły (limit 12 KB). Dotyczy ręcznych zapisów skryptem.

- **`hot.md` miesza końce linii:** frontmatter jest w CRLF, treść w LF — nie zakotwicz zapisu na dosłownym `\r\n\r\n` (asercja padnie i stracisz turę), użyj `re.search(r"## 🕐 Ostatnia aktualizacja\r?\n\r?\n", tekst)` albo wykryj dominujący koniec linii i jego powielaj. `log.md` jest CRLF — nowy wiersz dopisuj z `\r\n`.
- **Czytaj pliki sejfu z `newline=""`.** `Path.read_text()` bez tego parametru tłumaczy CRLF na LF, więc licznik bajtów i kontrola końców linii kłamia, a zapis robi plik o mieszanych końcach. Wzór: `p.open("r", encoding="utf-8", newline="").read()`, potem normalizacja `replace("
", "
")` i zapis `p.open("w", encoding="utf-8", newline="").write(t.replace("
", "
"))`. Limit `hot.md` sprawdzaj jako `len(p.open("rb").read()) <= 3100`.
- **Nie przycinaj `hot.md` pętlą po regexie punktów.** Regex z lookaheadem potrafi dopasować jeden wielki blok i skasować kilka starych punktów naraz; zamiast tego zbuduj całą sekcję `## 🕐 Ostatnia aktualizacja` od nowa (4–5 punktów, starsze zwinięte do jednej linii) i podmien ją w miejscu. Przebudowa samej sekcji często **nie wystarcza** — limit liczy się od całego pliku, a najwięcej bajtów siedzi w blokach „🟢 Stan potwierdzony” i „🟡 Aktywne ryzyka”; gdy po niej plik nadal przekracza 3100 B, ścinaj te bloki (powtórzenia, linie nieaktualne), a nie kolejne punkty historii. Po każdym przebiegu zmierz `len(path.read_bytes())`.
- **Podmieniając całą sekcję przez `re.sub`, podaj zamiennik jako funkcję** (`re.sub(wzor, lambda m: nowy, tekst)`), nigdy jako szablon tekstowy. W szablonie backslash jest znakiem ucieczki, więc ścieżki Windows i polskie fragmenty (`Desktop\jarvis-`, `C:\Users\majke`) kończą się `re.error: bad escape \j` i cały zapis pada w połowie. Zwykłe `str.replace(stary, nowy)` backslashami się nie przejmuje — przy pojedynczej podmianie zostań przy nim.
- **Tabelę dziennika sprawdzaj po edycji, wiersz po wierszu.** Wcześniejsza edycja potrafi zostawić wiersz z komórką uciętą w połowie, a jej ogon jako osobną linię **po kolejnym wierszu** — tabela przestaje się renderować, a treść wygląda jak przypadkowy tekst. Po zmianie upewnij się, że każdy wiersz zaczyna się od `|` i ma tyle samo komórek co nagłówek; osierocony fragment dopisz z powrotem do jego wiersza (przy okazji popraw nieaktualny opis w starym wierszu).
