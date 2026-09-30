<#
.SYNOPSIS
  Zapisuje klucz Jeva dla agentów (internet + prawdziwy komputer) — bezpiecznie, bez wpisywania go w rozmowie ani w kodzie.

.DESCRIPTION
  Klucz podajesz w ukrytym polu. Trafia WYŁĄCZNIE do %USERPROFILE%\.jarvis-os\jev.env (dostęp tylko dla Twojego konta) —
  plik czytają most, agent WWW i sterowanie komputerem. Opcjonalnie dopisuje ten sam klucz do config.local.js
  (ignorowany przez git), żeby działał też sędzia Jev w samym Jarvis OS.

  ZASADA: przez OpenRouter idzie WYŁĄCZNIE Jev (typesafe/jev-1.13). Modele pomocnicze do wpisywania tekstu (writer) NIGDY nie idą
  przez OpenRouter — podajesz je osobno (klucz Anthropic bezpośrednio) albo zostawiasz bez nich: wtedy komputer tylko klika.

  -Provider openrouter  (domyślnie) klucz z openrouter.ai/keys — Jev (agent WWW, sterowanie komputerem, sędzia w Jarvisie)
  -Provider typesafe    klucz z console.typesafe.ai/keys — Jev bezpośrednio
.EXAMPLE
  powershell -ExecutionPolicy Bypass -File integrations\set-key.ps1
#>
param([ValidateSet('openrouter', 'typesafe')][string]$Provider = 'openrouter', [switch]$NoJarvis)
$ErrorActionPreference = 'Stop'
$root = Join-Path $env:USERPROFILE '.jarvis-os'
$file = Join-Path $root 'jev.env'
$repo = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
function Ask-Secret($prompt) { $s = Read-Host $prompt -AsSecureString; $b = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($s); try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b).Trim() } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b) } }

$url = if ($Provider -eq 'openrouter') { 'https://openrouter.ai/keys' } else { 'https://console.typesafe.ai/keys' }
Write-Host "Klucz wygenerujesz na $url — wklej go poniżej (znaki nie są pokazywane)."
$key = Ask-Secret 'Klucz Jeva'
if (-not $key) { throw 'Nie podano klucza.' }
if ($Provider -eq 'openrouter' -and $key -notmatch '^sk-or-') { Write-Warning 'Klucz OpenRouter zwykle zaczyna się od "sk-or-". Zapisuję mimo to.' }

$lines = @('# Jarvis OS — klucz i ustawienia Jeva dla agentów. Plik lokalny, nie commituj, nie wysyłaj.', "# dostawca: $Provider ($(Get-Date -Format 'yyyy-MM-dd'))")
if ($Provider -eq 'openrouter') {
  $lines += @(
    "TYPESAFE_API_KEY=$key", 'TYPESAFE_BASE_URL=https://openrouter.ai/api', 'TYPESAFE_DEFAULT_MODEL=typesafe/jev-1.13', 'JEV_MODEL=typesafe/jev-1.13')
} else {
  $lines += @("TYPESAFE_API_KEY=$key")
}
$w = Ask-Secret 'Opcjonalnie: klucz Anthropic (bezpośrednio, NIE OpenRouter) do wpisywania tekstu przez sterowanie komputerem (Enter = pomiń; bez niego komputer tylko klika)'
if ($w) { $lines += "ANTHROPIC_API_KEY=$w" } else { $lines += '# brak modelu pomocniczego (writer): sterowanie komputerem klika, ale nie wpisuje tekstu ani nie składa odpowiedzi końcowej' }
$lines += @('# Windows OCR: pakiet języka systemu (angielski bywa niezainstalowany)', 'CLICKER_OCR_LANGUAGE=pl')

New-Item -ItemType Directory -Force $root | Out-Null
Set-Content -Path $file -Value $lines -Encoding UTF8
icacls $file /inheritance:r /grant:r "$($env:USERNAME):(R,W)" | Out-Null   # tylko Twoje konto
Write-Host "Zapisano $file (dostęp tylko dla $env:USERNAME)." -ForegroundColor Green

if ($Provider -eq 'openrouter' -and -not $NoJarvis) {
  $ans = Read-Host 'Użyć tego klucza także dla sędziego Jev w samym Jarvis OS (config.local.js)? [T/n]'
  if ($ans -notmatch '^[nN]') {
    $cfg = Join-Path $repo 'config.local.js'
    if (Test-Path $cfg) { $txt = Get-Content $cfg -Raw } else { $txt = "window.JARVIS_CONFIG = {`n};`n" }
    $txt = [regex]::Replace($txt, "(?m)^\s*(jevKey|jevOn)\s*:.*\r?\n", '')
    $txt = [regex]::Replace($txt, 'window\.JARVIS_CONFIG\s*=\s*\{', "window.JARVIS_CONFIG = {`n  jevKey: '$key',`n  jevOn: true,")
    Set-Content -Path $cfg -Value $txt -Encoding UTF8 -NoNewline
    Write-Host "Zaktualizowano $cfg (plik ignorowany przez git)." -ForegroundColor Green
  }
}
Write-Host "`nGotowe. Zrestartuj most (bridge\start-bridge.bat), żeby wczytał klucz. Sprawdź wszystko: integrations\doctor.ps1"
