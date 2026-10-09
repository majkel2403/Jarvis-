# Hermes Runtime Unification Design

**Date:** 2026-10-07

## Goal

Ujednolicić Hermesa i integrację Jarvis OS tak, aby na hoście działał jeden gateway multiplex, a `jarvis-desktop` był jedynym profilem użytkowym Jarvisa. Usunąć wpływ historycznego profilu `jarvis2`, rozjazd portów 8642/8643, sprzeczne polityki retencji i przestarzałe watchdogi, bez utraty danych i bez naruszania bieżących niezacommitowanych zmian w repo.

## Stan faktyczny

- Aktywny gateway: root `C:\Users\majke\.hermes`, PID 40816, Hermes 0.21.5, port 8642.
- Gateway multiplexuje: `default`, `jarvis-desktop`, `jarvis2`.
- Telegram jest podłączony wyłącznie dla `jarvis-desktop`.
- Root gateway startuje przez autostart Hermesa: `~\.hermes\gateway-service\Hermes_Gateway_37bd18b1.vbs`.
- Stary task `JarvisOS-DesktopGateway` nadal próbuje uruchamiać standalone `jarvis-desktop` na 8643; nowy Hermes odmawia, bo profil jest już serwowany przez multiplex.
- `jarvis2` ma własny stan, config, logi i crony; crony są wyłączone, ale profil nadal uczestniczy w multiplexie.
- Retencja jest niespójna: root 30 dni, `jarvis-desktop` 60 dni, `jarvis2` 90 dni; runtime loguje prune wg 90 dni.
- Cron `Cotygodniowe sprzatanie sesji` w `jarvis-desktop` twardo prune'uje po 30 dniach.
- `hooks_auto_accept`: root=false, `jarvis-desktop`=true, `jarvis2`=false.
- `session_reset.mode: both` jest ignorowane przez Hermes 0.21.5 bez pluginu `hermes-session-reset-policy`.
- CLI `~\.hermes\bin\hermes.exe` obecnie zgłasza `no dependency environment is committed for this install`; istnieje działający stary venv, przez który można uruchomić `hermes_cli.main pm repair`.
- Jarvis ma mieszany kontrakt portów: część kodu zna 8642, ale skrypty autostartu, restartu, health-checki i writer fallback nadal zakładają 8643.

## Stan docelowy

1. Jeden host gateway, należący do profilu technicznego `default`, na 127.0.0.1:8642.
2. `jarvis-desktop` jako jedyny profil użytkowy Jarvis OS.
3. `jarvis2` usunięty z live multiplexu przez mechanizm profili Hermesa; pełny snapshot zachowany do rollbacku.
4. Jeden kontrakt API: lokalny gateway Hermesa = 8642.
5. Karta Jarvisa rozmawia z Hermesem przez Bridge `/bridge/v1`; klucz API nigdy nie trafia do przeglądarki.
6. Bridge/Site pozostają na 8651/4000 i nadal są nadzorowane przez Jarvisowe taski.
7. Jarvis nie zarządza drugim gatewayem Hermesa. Właścicielem gatewaya jest natywny autostart Hermesa.
8. Jedna jawna polityka retencji sesji: 30 dni.
9. Jedna jawna polityka hooków dla `jarvis-desktop`: `hooks_auto_accept: true` pozostaje celowym wyjątkiem profilu użytkowego; root pozostaje false.
10. Przestarzałe `session_reset.mode` nie może udawać działającej funkcji: albo instalujemy plugin reset-policy, albo usuwamy tę obietnicę z konfiguracji i dokumentacji. Domyślnie: nie instalować nowego pluginu w ramach cleanupu; usunąć przestarzałe założenie.
11. Repo `Desktop\jarvis-` pozostaje źródłem prawdy dla integracji Jarvis/Hermes.
12. Każda zmiana ma snapshot, test przed, minimalną zmianę, test po i rollback.

## Zasady bezpieczeństwa migracji

- Nie usuwać ręcznie profili ani katalogów przed snapshotem.
- Nie ruszać `.env` wartościami w raportach i testach; sprawdzać wyłącznie obecność kluczy.
- Nie wykonywać force-kill gatewaya, jeśli ma `active_agents > 0`.
- Nie wykonywać `git reset`, `git clean`, checkoutu ani stashowania istniejących zmian użytkownika.
- Nie modyfikować obecnie zmienionych plików Obsidian/HERMES bez zachowania ich zawartości.
- Nie robić kilku zmian architektonicznych naraz; jedna hipoteza, jeden test.
- Nie usuwać backupów w tej migracji. Cleanup przestrzeni dyskowej to osobny projekt.

## Architektura po migracji

```
Windows Startup
  └─ Hermes_Gateway_37bd18b1.vbs
       └─ default host gateway :8642
            ├─ default (techniczny host)
            └─ jarvis-desktop
                 ├─ Telegram
                 ├─ cron
                 ├─ SOUL / MEMORY / skills
                 └─ MCP -> Bridge :8651

JarvisOS tasks
  ├─ JarvisOS-Site   -> :4000
  ├─ JarvisOS-Bridge -> :8651
  └─ JarvisOS-OpenTab
  [brak osobnego JarvisOS-DesktopGateway]

Browser
  └─ Bridge /bridge/v1
       └─ host gateway :8642
```

## Źródła prawdy

- Hermes core/runtime: `C:\Users\majke\.hermes\hermes-agent`
- Host config: `C:\Users\majke\.hermes\config.yaml`
- Profil Jarvis: `C:\Users\majke\.hermes\profiles\jarvis-desktop`
- Integracja Jarvis/Hermes: `C:\Users\majke\Desktop\jarvis-\hermes`
- Autostart Jarvisa: `C:\Users\majke\Desktop\jarvis-\bridge`
- ADR-y: `C:\Users\majke\Desktop\jarvis-\docs\adr`

## Kryteria sukcesu

- `hermes --version`, `hermes pm doctor` i `hermes -p jarvis-desktop doctor` działają z normalnego launchera.
- Dokładnie jeden proces `gateway run` słucha na 8642.
- Port 8643 nie jest wymagany przez produkcyjny Jarvis OS.
- `served_profiles` nie zawiera `jarvis2`.
- Telegram `jarvis-desktop` działa po restarcie hosta.
- Bridge 8651 i Site 4000 działają.
- `/bridge/v1/models` i test czatu przez Bridge przechodzą.
- Retencja nie ma wartości 60/90 w aktywnym kontrakcie.
- Strażnik konfiguracji nie zgłasza starego modelu standalone jako wymagania.
- Wszystkie testy jednostkowe zmienionych komponentów przechodzą.
- Dokumentacja nie mówi już, że `jarvis-desktop` ma własny gateway 8643.
