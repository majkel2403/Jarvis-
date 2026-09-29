<#
.SYNOPSIS
  Tworzy lekki profil Hermesa "jarvis-desktop" sterujący pulpitem Jarvis OS przez natywne narzędzia MCP.

.DESCRIPTION
  1. hermes profile create <Name> --clone-from <Source>   (kanały Telegrama NIE są klonowane)
  2. hermes\apply_profile.py: mcp_servers.jarvis_desktop, platform_toolsets.api_server, disabled_toolsets, .env, SOUL.md
  3. (opcjonalnie) -LoginXai: logowanie xAI (Grok) — kod urządzenia zatwierdzasz w przeglądarce. Zapisuje się w katalogu głównym
     (hermes -p default), z którego profile bez własnych wpisów xAI korzystają wspólnie (Hermes 0.21: 'hermes -p <profil> auth add xai-oauth'
     dla profilu bez własnych wierszy po cichu gubi wpis). Nie kopiujemy auth.json: refresh tokeny xAI są jednorazowe.

  Twój obecny profil i gateway (np. jarvis2 + Telegram) NIE są zmieniane.
  Hermes ma działać natywnie w Windows (NIE przez WSL).

.EXAMPLE
  .\hermes\install-profile.ps1 -DryRun
  .\hermes\install-profile.ps1 -LoginXai
#>
param(
  [string]$Name = 'jarvis-desktop',
  [string]$Source = '',
  [int]$Port = 8643,
  [string]$BridgeUrl = 'http://127.0.0.1:8651',
  [string]$HermesHome = '',
  [switch]$LoginXai,
  [switch]$DryRun
)
$ErrorActionPreference = 'Stop'
$install = Join-Path $env:USERPROFILE '.hermes'
$hermes  = Join-Path $install 'bin\hermes.exe'
$python  = Join-Path $install 'hermes-agent\venv\Scripts\python.exe'
if (-not (Test-Path $hermes)) { throw "Nie znaleziono hermes.exe: $hermes (Hermes musi być zainstalowany natywnie w Windows)" }
if (-not (Test-Path $python)) { throw "Nie znaleziono Pythona Hermesa: $python" }
if ($HermesHome) { $env:HERMES_HOME = $HermesHome }
$home_ = if ($env:HERMES_HOME) { $env:HERMES_HOME } else { $install }

if (-not $Source) {
  $ap = Join-Path $home_ 'active_profile'
  $Source = if (Test-Path $ap) { (Get-Content $ap -Raw).Trim() } else { 'default' }
}
$repo = Split-Path -Parent $PSScriptRoot
$bridge = Join-Path $repo 'bridge\jarvis_bridge.py'
$token = (& $python $bridge --show-token).Trim()
$pdir = Join-Path $home_ "profiles\$Name"
Write-Host "Hermes home : $home_"
Write-Host "Profil      : $Name (klon z: $Source)"
Write-Host "API         : http://127.0.0.1:$Port/v1   Most: $BridgeUrl"

if (-not (Test-Path $pdir)) {
  if ($DryRun) { Write-Host "[dry-run] hermes profile create $Name --clone-from $Source --no-alias" }
  else { & $hermes profile create $Name --clone-from $Source --no-alias; if ($LASTEXITCODE -ne 0) { throw "profile create nie powiodło się" } }
} else { Write-Host "Profil już istnieje — aktualizuję konfigurację." }

$pyArgs = @((Join-Path $PSScriptRoot 'apply_profile.py'), '--home', $home_, '--name', $Name, '--port', $Port, '--bridge-url', $BridgeUrl, '--bridge-token', $token)
if ($DryRun) { $pyArgs += '--dry-run' }
if ($DryRun -and -not (Test-Path $pdir)) { Write-Host "[dry-run] apply_profile.py zmieniłby config.yaml/.env/SOUL.md profilu $Name"; exit 0 }
& $python @pyArgs
if ($LASTEXITCODE -ne 0) { throw "apply_profile.py zakończył się błędem" }

if ($LoginXai -and -not $DryRun) {
  Write-Host "`nLogowanie xAI (Grok) — otwórz podany adres i zatwierdź kod (zapis w katalogu głównym Hermesa, wspólny dla profili bez własnych wpisów):"
  & $hermes -p default auth add xai-oauth --type oauth --no-browser --timeout 900
  Write-Host "Gotowe. Sprawdź: $hermes -p $Name auth status xai-oauth   Uruchom gateway: hermes\start-desktop-gateway.bat"
} elseif (-not $DryRun) {
  Write-Host "`nUwaga: Grok 4.3 wymaga logowania xAI. Uruchom ponownie z -LoginXai albo ręcznie:"
  Write-Host "  $hermes -p default auth add xai-oauth --type oauth --no-browser"
  Write-Host "(NIE używaj -p $Name — ten wariant nie zapisuje wpisu dla profilu bez własnych wierszy xAI.)"
}

Write-Host @"

Dalej:
  1. Most:      bridge\start-bridge.bat            (zostaw uruchomiony; token pobiera się automatycznie)
  2. Gateway:   hermes\start-desktop-gateway.bat   (profil $Name, port $Port)
  3. Jarvis OS: Ustawienia → Hermes → 'Hermes Desktop (profil jarvis-desktop + most MCP)', wpisz API_SERVER_KEY
     Tryb MCP włączy się sam, gdy profil zgłosi się do mostu (Ustawienia → Most pulpitu dla Hermesa).
"@
