# ADR 0011 — Jeden host gateway Hermesa i profil jarvis-desktop przez multiplex

**Status:** przyjęta 2026-10-07

## Kontekst

Hermes 0.21.5 obsługuje wiele profili przez jeden gateway hostowany przez profil techniczny `default`.
Jarvis OS miał jeszcze starszy mechanizm `JarvisOS-DesktopGateway`, który co 5 minut próbował uruchamiać osobny
`jarvis-desktop` na porcie 8643. Host gateway działał już na 8642 i serwował `default`, `jarvis-desktop`
oraz historyczny `jarvis2`, więc watchdog 8643 był reliktem poprzedniej architektury.

## Decyzja

- Jeden host gateway Hermesa działa na `127.0.0.1:8642` i należy do profilu technicznego `default`.
- `jarvis-desktop` jest jedynym profilem użytkowym Jarvis OS i jest routowany przez
  `http://127.0.0.1:8642/p/jarvis-desktop/v1`.
- Karta Jarvis OS nadal rozmawia z Hermesem przez Bridge `/bridge/v1`; klucz gatewaya nie trafia do przeglądarki.
- Jarvis OS zarządza tylko Site `:4000`, Bridge `:8651`, OpenTab i zewnętrznym zadaniem bezpiecznego restartu.
- `JarvisOS-DesktopGateway` zostaje usunięty.
- Historyczny profil `jarvis2` zostaje wyeksportowany, a następnie usunięty z live multiplexu.
- Retencja sesji dla aktywnego systemu = 30 dni.
- Przestarzałe `session_reset.mode` nie jest traktowane jako działająca polityka bez dedykowanego pluginu.

## Konsekwencje

Nie ma konfliktu 8642/8643 ani dwóch właścicieli lifecycle gatewaya. Restart hosta odbywa się przez
`hermes -p default gateway restart`, a health-check weryfikuje listener 8642, `served_profiles` oraz Telegram
`jarvis-desktop`.
