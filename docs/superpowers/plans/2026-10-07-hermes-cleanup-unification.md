# Hermes Cleanup & Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Naprawić i ujednolicić lokalny Hermes/Jarvis tak, aby działał jeden host gateway multiplex na 8642, `jarvis-desktop` był jedynym profilem użytkowym Jarvisa, a stare standalone/watchdog/config drift nie wpływały na runtime.

**Architecture:** Hermes 0.21.5 działa jako jeden host gateway uruchamiany z rootowego `~/.hermes`; profil `default` jest technicznym hostem, a `jarvis-desktop` jest profilem użytkowym. Jarvis OS nie uruchamia własnego gatewaya, tylko Site :4000 i Bridge :8651. Profil `jarvis2` jest eksportowany i usuwany z live multiplexu bez kasowania backupu.

**Tech Stack:** Windows PowerShell, Python 3.14/3.11, Hermes Agent 0.21.5, Task Scheduler, JavaScript/Node tests, pytest, Git.

**Spec:** `docs/superpowers/specs/2026-10-07-hermes-runtime-unification-design.md`

## Global Constraints

- Nie używać `git reset`, `git clean`, checkoutu ani stashowania istniejących zmian użytkownika.
- Nie ujawniać wartości z `.env`; testować tylko obecność kluczy.
- Nie usuwać backupów podczas tej migracji.
- Nie zatrzymywać gatewaya przy `active_agents > 0`, chyba że użytkownik świadomie zaakceptuje przerwanie.
- Repo `Desktop\jarvis-` pozostaje źródłem prawdy dla integracji Jarvis/Hermes.
- Każda faza: baseline → jedna zmiana → weryfikacja → rollback point.
- Produkcyjny kontrakt portów po migracji: Hermes 8642, Bridge 8651, Site 4000.
- `default` nie jest usuwany; jest hostem multiplexu.
- `jarvis2` ma być najpierw wyeksportowany, dopiero potem usunięty z live profiles.
- Istniejące niezacommitowane zmiany w `hermes/HERMES.md`, Obsidian plugin/scripts/skill/tests pozostają nietknięte poza liniami bezpośrednio koniecznymi dla migracji.

## Review Focus

- Czy po naprawie launchera nadal można uruchomić gateway po restarcie Windows.
- Czy usunięcie `jarvis2` naprawdę usuwa go z `served_profiles`, bez odtworzenia katalogu przez multiplexer.
- Czy Bridge nadal potrafi rozmawiać z Hermesem po zmianie 8643 → 8642.
- Czy restart zewnętrzny nie zabija aktywnej rozmowy i potrafi ponownie podnieść host gateway.
- Czy config guard nie próbuje przywracać starej architektury standalone.

---

### Task 1: Zamrożenie baseline i pełny rollback

**Files:**
- Create: `docs/superpowers/evidence/hermes-pre-migration-2026-10-07.md`
- Create: managed profile export `~/.hermes/profile-exports/jarvis2-*.tar.gz`
- Create: filesystem snapshot folder `~/.hermes/backups/pre-multiplex-unification-20261007/`

**Interfaces:**
- Consumes: obecny live gateway i profile.
- Produces: komplet dowodów i rollback przed pierwszą zmianą.

- [ ] **Step 1: Zapisz baseline runtime**

Run:
```powershell
Get-CimInstance Win32_Process | ? { $_.CommandLine -match 'hermes_cli.main gateway run' } | select ProcessId,ParentProcessId,ExecutablePath,CommandLine
Get-NetTCPConnection -State Listen | ? LocalPort -in 4000,8642,8643,8651
Get-Content $HOME\.hermes\gateway_state.json -Raw
Get-ScheduledTask | ? TaskName -match 'JarvisOS|Hermes' | select TaskName,State
```
Expected: jeden gateway na 8642; Bridge 8651; Site 4000; brak listenera 8643.

- [ ] **Step 2: Zapisz bezpieczne metadane configów bez sekretów**

Run: skrypt wypisujący tylko: profile, timezone, retention_days, hooks_auto_accept, API_SERVER_PORT, enabled cron count.

Expected: baseline zawiera root/jarvis-desktop/jarvis2 bez wartości tokenów/API keys.

- [ ] **Step 3: Wyeksportuj `jarvis2` oficjalnym mechanizmem**

Run:
```powershell
hermes profile export jarvis2
```
Jeśli launcher nadal nie działa, użyj tymczasowo:
```powershell
& "$HOME\.hermes\hermes-agent\venv\Scripts\python.exe" -m hermes_cli.main profile export jarvis2
```
Expected: plik `.tar.gz` pod `~/.hermes/profile-exports/`.

- [ ] **Step 4: Zrób dodatkowy snapshot plików sterujących**

Copy only:
- root `config.yaml`, `.env` jako plik backupowy bez wyświetlania,
- `profiles/jarvis-desktop/config.yaml`, `.env`, `SOUL.md`, `cron/jobs.json`,
- `profiles/jarvis2/config.yaml`, `.env`, `SOUL.md`, `cron/jobs.json`,
- Task Scheduler XML dla `JarvisOS-Bridge`, `JarvisOS-Site`, `JarvisOS-DesktopGateway`, `JarvisOS-GatewayRestart`.

- [ ] **Step 5: Verify rollback artifacts**

Expected: eksport `jarvis2` istnieje i ma rozmiar > 0; snapshot zawiera wszystkie wymienione pliki.

---

### Task 2: Naprawa launchera i PM Hermesa

**Files:**
- Runtime-managed: `~/.hermes/installs/992137d35ce97aad/`
- Do not hand-edit: `~/.hermes/bin/hermes.cmd`, `hermes.exe`

**Interfaces:**
- Consumes: działający legacy venv `hermes-agent/venv`.
- Produces: działający normalny `hermes.exe` i committed dependency environment.

- [ ] **Step 1: Reproduce failure**

Run:
```powershell
hermes --version
hermes pm doctor
```
Expected before fix: `no dependency environment is committed for this install`.

- [ ] **Step 2: Potwierdź stan PM**

Run przez legacy venv:
```powershell
& "$HOME\.hermes\hermes-agent\venv\Scripts\python.exe" -m hermes_cli.main pm doctor
& "$HOME\.hermes\hermes-agent\venv\Scripts\python.exe" -m hermes_cli.main pm status
```
Zapisz wynik do evidence.

- [ ] **Step 3: Minimalna naprawa**

Run:
```powershell
& "$HOME\.hermes\hermes-agent\venv\Scripts\python.exe" -m hermes_cli.main pm repair
```
Expected: rebuild recorded dependency environment bez zmiany dependency graph.

- [ ] **Step 4: Verify launcher**

Run:
```powershell
hermes --version
hermes pm doctor
hermes gateway status
hermes -p jarvis-desktop doctor
```
Expected: wszystkie komendy startują z normalnego launchera.

- [ ] **Step 5: Regression check gateway**

Sprawdź, że dotychczasowy PID gatewaya nadal słucha na 8642 albo — jeśli PM wymusił restart — nowy gateway wrócił i Telegram jest connected.

**Rollback:** przy problemie nie modyfikować ręcznie launchera; używać legacy venv i snapshotu PM. Nie przechodzić do Task 3.

---

### Task 3: Zdefiniowanie jednego kontraktu runtime 8642

**Files:**
- Modify: `hermes/apply_profile.py`
- Modify: `hermes/install-profile.ps1`
- Modify: `hermes/evals/run_evals.py`
- Modify: `hermes/scripts/health_check.py`
- Modify: `hermes/scripts/jarvis_daily.py`
- Modify: `bridge/writer_proxy.py`
- Modify: `integrations/set-key.ps1`
- Modify: `integrations/doctor.ps1`
- Modify docs containing production 8643 assumptions.
- Test: `tests/unit/bridge.test.js`
- Test: existing Python tests around writer/bridge/health.

**Interfaces:**
- Consumes: host gateway contract `127.0.0.1:8642`.
- Produces: every production path points to 8642; 8643 remains at most legacy compatibility in tests/docs migration notes.

- [ ] **Step 1: Add failing contract tests**

Assertions:
- `writer_proxy.hermes_target()` defaults to `http://127.0.0.1:8642/v1/chat/completions`.
- generated/applied profile API port defaults to 8642.
- health check tests 8642, not 8643.
- Jarvis bridge pairing still returns proxy URL `/bridge/v1`, never gateway key.

- [ ] **Step 2: Run tests and confirm failure where 8643 remains**

Run focused Node + pytest suites.

- [ ] **Step 3: Change production defaults 8643 → 8642**

Do not mass-replace blindly. Change only semantic production references; keep historical docs/examples clearly marked as legacy where useful.

- [ ] **Step 4: Run focused tests**

Expected: all new contract assertions pass.

- [ ] **Step 5: Search for remaining 8643**

Run repository search.

Expected: remaining hits are only migration/history/backward-compat tests, not active startup, writer fallback, health check or setup defaults.

- [ ] **Step 6: Commit isolated runtime contract change**

Suggested commit:
`fix(hermes): unify Jarvis runtime on multiplex port 8642`

---

### Task 4: Usunięcie starego Jarvis-owned standalone gateway

**Files:**
- Modify: `bridge/run-service.ps1`
- Modify: `bridge/install-autostart.ps1`
- Modify: `bridge/restart-gateway.ps1`
- Modify: `bridge/redeploy.ps1`
- Modify: `hermes/scripts/config_guard.py`
- Test: `bridge/tests/test_scripts.py` or new PowerShell contract test.

**Interfaces:**
- Consumes: natywny root gateway service/startup.
- Produces: Jarvis zarządza Site/Bridge/OpenTab; Hermes sam zarządza host gatewayem.

- [ ] **Step 1: Add failing tests for task topology**

Expected task set after migration:
- `JarvisOS-Site`
- `JarvisOS-Bridge`
- `JarvisOS-OpenTab`
- `JarvisOS-GatewayRestart`
- brak `JarvisOS-DesktopGateway`.

- [ ] **Step 2: Remove `gateway` from `run-service.ps1`**

`ValidateSet` i port map nie mogą już zawierać standalone gatewaya.

- [ ] **Step 3: Update `install-autostart.ps1`**

Nie rejestruj `JarvisOS-DesktopGateway`.
Bridge i Site nadal mają watchdog co 5 min.
OpenTab tylko przy logowaniu.

- [ ] **Step 4: Rewrite external restart task for host gateway**

`restart-gateway.ps1`:
- czyta `~/.hermes/gateway_state.json`, nie profile/jarvis-desktop/gateway_state.json;
- czeka na `active_agents == 0`;
- wykonuje `hermes -p default gateway restart` z taska zewnętrznego;
- oczekuje listenera 8642;
- weryfikuje `served_profiles` i Telegram `jarvis-desktop`;
- nie czeka na 8643;
- nie uruchamia `JarvisOS-DesktopGateway`.

- [ ] **Step 5: Update `redeploy.ps1`**

Redeploy może restartować Bridge i opcjonalnie host gateway przez `JarvisOS-GatewayRestart`; wszystkie health checks patrzą na 8642.

- [ ] **Step 6: Update config guard**

Strażnik ma wymagać:
- natywnego host gatewaya,
- braku `JarvisOS-DesktopGateway`,
- listenera 8642,
- Bridge/Site tasków co 5 min.

Usuń regułę zakładającą osobny jarvis-desktop gateway.

- [ ] **Step 7: Re-register tasks from updated installer**

Najpierw eksport XML bieżących tasków, potem uruchom installer.
Expected: stary `JarvisOS-DesktopGateway` zniknął; pozostałe taski istnieją.

- [ ] **Step 8: Verify live runtime**

Expected: jeden gateway na 8642, Bridge 8651, Site 4000, Telegram connected.

**Rollback:** odtwórz Task Scheduler XML i poprzednie pliki bridge z Git/snapshotu.

---

### Task 5: Bezpieczne wycofanie zombie profile `jarvis2`

**Files:**
- Runtime: `~/.hermes/profiles/jarvis2`
- Backup: export from Task 1.

**Interfaces:**
- Consumes: działający profile export i sprawny CLI.
- Produces: `jarvis2` poza live profile list i poza schedulerem multiplexu.

- [ ] **Step 1: Pre-delete proof**

Run:
```powershell
hermes profile show jarvis2
hermes gateway list
```
Potwierdź, że Telegram token nie jest w `jarvis2` i wszystkie jego crony są disabled/paused.

- [ ] **Step 2: Verify export can be inspected**

Sprawdź archive listing i obecność config/state/memories bez importowania.

- [ ] **Step 3: Delete profile through Hermes, never by rmdir**

Run:
```powershell
hermes profile delete jarvis2 -y
```
Ta ścieżka tworzy tombstone, sygnalizuje multiplexer, zwalnia uchwyty i czyści identity.

- [ ] **Step 4: Verify multiplexer reconciliation**

Expected:
- katalog `profiles/jarvis2` nie istnieje,
- `served_profiles` = `default`, `jarvis-desktop`,
- brak jarvis2 w gateway scheduler logs,
- brak odtworzenia katalogu po minimum dwóch cyklach reconcile.

- [ ] **Step 5: Verify rollback procedure**

Dokumentuj:
```powershell
hermes profile import <export-jarvis2.tar.gz> --name jarvis2
```
Nie wykonywać rollbacku, tylko potwierdzić, że archiwum istnieje.

---

### Task 6: Ujednolicenie retencji i polityk profili

**Files:**
- Modify: `hermes/apply_profile.py`
- Modify: `hermes/scripts/config_guard.py`
- Modify: active `jarvis-desktop` only through apply_profile.
- Modify cron definition through Hermes CLI, not manual JSON editing.

**Interfaces:**
- Consumes: tylko `default` + `jarvis-desktop`.
- Produces: jedna polityka sesji bez 30/60/90 conflict.

- [ ] **Step 1: Add contract to `apply_profile.py`**

Target:
- `sessions.retention_days = 30` dla jarvis-desktop.
- odpowiedni drugi retention key także 30, jeśli oba są nadal wymagane przez schema.
- `timezone = Europe/Warsaw`.
- `hooks_auto_accept = true` jawnie jako decyzja profilu jarvis-desktop.

- [ ] **Step 2: Update weekly cleanup cron**

Obecny explicit prune `--older-than 30` pozostaje 30 i przestaje przeczyć configowi.

- [ ] **Step 3: Root config**

Root/host też ma 30 dni i `hooks_auto_accept=false`.
Nie przenosić ustawień użytkowego profilu do root.

- [ ] **Step 4: Remove stale `session_reset.mode` promise**

Nie instalować nowego pluginu w cleanupie.
Usuń lub zdezaktywuj ustawienie, którego 0.21.5 nie stosuje, i popraw dokumentację.

- [ ] **Step 5: Run apply_profile in dry-run**

Expected: tylko zamierzone zmiany.

- [ ] **Step 6: Apply profile**

Uruchom repo-controlled `hermes/apply_profile.py` dopiero po review dry-run.

- [ ] **Step 7: Run config guard verbose**

Expected: brak odstępstw wynikających ze starego standalone/multiplex conflict.

---

### Task 7: Aktualizacja dokumentacji i ADR

**Files:**
- Create: `docs/adr/0011-hermes-one-host-multiplex-gateway.md`
- Modify: `docs/guide/hermes-i-most.md`
- Modify: `docs/spec/14-integracje.md`
- Modify: `README.md`
- Modify: `hermes/HERMES.md` tylko w miejscach dotyczących portu/topologii.
- Runtime docs `~/.hermes/WHERE-IS-THE-CONFIG.md` i `HERMES-PLIKI-PRZEWODNIK.md` generować/synchronizować z repo lub oznaczyć jako snapshot historyczny.

**Interfaces:**
- Produces: dokumentacja zgodna 1:1 z runtime.

- [ ] **Step 1: ADR**

Decyzja: jeden host gateway, `default` jako host, `jarvis-desktop` jako profil użytkowy, 8642 jako lokalny API port.

- [ ] **Step 2: Remove claims**

Usuń twierdzenia:
- „jarvis-desktop jedyny aktywny gateway na 8643”,
- „JarvisOS-DesktopGateway jest wymaganym watchdogiem”,
- „profile są zawsze osobnymi gatewayami”.

- [ ] **Step 3: Document multiplex semantics**

Wyjaśnij różnicę:
`active_profile` ≠ `served_profiles`.
Profil może być serwowany przez host gateway bez własnego PID/portu.

- [ ] **Step 4: Search contradiction test**

Search terms:
`8643`, `jedyny aktywny profil`, `DesktopGateway`, `90 days`, `60 days`.

Expected: brak aktywnych instrukcji sprzecznych z nowym kontraktem.

---

### Task 8: Testy pełnej ścieżki po migracji

**Files:**
- No product edits unless test reveals root cause.
- Evidence append to migration report.

**Interfaces:**
- Consumes: final migrated runtime.
- Produces: dowód działania end-to-end.

- [ ] **Step 1: Hermes health**

Run:
```powershell
hermes --version
hermes pm doctor
hermes gateway status
hermes gateway list
hermes -p jarvis-desktop doctor
```

- [ ] **Step 2: Process/port invariant**

Expected:
- exactly one gateway process,
- 8642 LISTEN,
- 8643 not required/listening,
- 8651 LISTEN,
- 4000 LISTEN.

- [ ] **Step 3: Profile invariant**

Expected `served_profiles`: only `default`, `jarvis-desktop`.

- [ ] **Step 4: Bridge API**

With local Origin + Bridge token:
- `GET /bridge/hermes` returns `proxy=true`,
- URL points to `/bridge/v1`,
- `key` empty,
- models endpoint proxies successfully.

- [ ] **Step 5: Telegram smoke**

Wyślij nieszkodliwe polecenie tekstowe.
Expected: request lands in session `agent:jarvis-desktop:telegram:...` and response returns.

- [ ] **Step 6: Jarvis desktop smoke**

Open local Site; verify Bridge client connects; send harmless chat request; verify Process Log receives real event.

- [ ] **Step 7: Cron smoke**

List crons.
Expected: jarvis-desktop jobs only; no live jarvis2 jobs; next_run timestamps valid for Europe/Warsaw.

- [ ] **Step 8: Restart test**

Run external `JarvisOS-GatewayRestart`.
Expected: gateway comes back on 8642, Telegram reconnects, Bridge/Site remain healthy.

- [ ] **Step 9: Reboot-survival test**

Po kontrolowanym restarcie Windows:
- native Hermes Startup launches one host gateway,
- JarvisOS-Site/Bridge autostart,
- brak standalone gateway 8643,
- Telegram connected.

---

### Task 9: Cleanup history — osobny etap, nie część krytycznej migracji

**Files:** backups/archive only.

**Interfaces:**
- Consumes: minimum kilka dni stabilnego działania po migracji.
- Produces: mniej szumu na dysku, bez utraty rollbacku.

- [ ] **Step 1: Inventory old backups by age/size**
- [ ] **Step 2: Classify KEEP / ARCHIVE / DELETE-CANDIDATE**
- [ ] **Step 3: Never delete latest profile export, latest pre-migration snapshot, or current config snapshots**
- [ ] **Step 4: Present deletion candidates to user before any deletion**

---

## Stop Conditions

Natychmiast zatrzymać wykonanie planu, jeśli:
- PM repair zmienia dependency graph zamiast rebuildować recorded graph;
- po Task 4 pojawiają się dwa gatewaye;
- `jarvis2` odtwarza się po oficjalnym delete;
- Telegram znika z `jarvis-desktop`;
- Bridge przestaje proxy'ować do Hermesa po 8642;
- config guard zaczyna automatycznie cofać nową architekturę;
- test wymaga ruszenia niezwiązanych niezacommitowanych zmian użytkownika.

## Final acceptance

Plan jest zakończony dopiero, gdy jednocześnie:
1. CLI jest zdrowe.
2. Jest jeden gateway 8642.
3. `jarvis2` nie jest live.
4. Jarvis nie uruchamia standalone gatewaya.
5. Bridge/Site działają.
6. Telegram działa.
7. Retencja = 30 dni bez konfliktów.
8. Config guard akceptuje stan.
9. Dokumentacja zgadza się z runtime.
10. Reboot odtwarza dokładnie ten sam zdrowy stan.
