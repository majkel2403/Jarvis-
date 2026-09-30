<#
.SYNOPSIS
  Uruchamia jedną usługę Jarvis OS (używane przez autostart z install-autostart.ps1; można też ręcznie).

.DESCRIPTION
  -Service site     strona Jarvis OS: python -m http.server 4000 (katalog repozytorium)
  -Service bridge   most MCP + agenci: bridge\jarvis_bridge.py (port 8651)
  -Service gateway  Hermes, profil jarvis-desktop (port 8643); czeka, aż most wystartuje
  Gdy port już nasłuchuje, nic nie robi (bez drugiej kopii). Logi: %USERPROFILE%\.jarvis-os\logs\<usługa>.*.log
.EXAMPLE
  powershell -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File bridge\run-service.ps1 -Service bridge
#>
param([Parameter(Mandatory)][ValidateSet('site', 'bridge', 'gateway')][string]$Service)
$ErrorActionPreference = 'Stop'
$repo   = Split-Path -Parent $PSScriptRoot
$py     = Join-Path $env:USERPROFILE '.hermes\hermes-agent\venv\Scripts\python.exe'
$hermes = Join-Path $env:USERPROFILE '.hermes\bin\hermes.exe'
$logs   = Join-Path $env:USERPROFILE '.jarvis-os\logs'
New-Item -ItemType Directory -Force $logs | Out-Null
$port = @{ site = 4000; bridge = 8651; gateway = 8643 }[$Service]
function Listening($p) { [bool](Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue) }
if (Listening $port) { exit 0 }

switch ($Service) {
  'site'    { $exe = $py; $argv = @('-m', 'http.server', '4000', '--bind', '127.0.0.1'); $cwd = $repo }
  'bridge'  { $exe = $py; $argv = @("`"$(Join-Path $repo 'bridge\jarvis_bridge.py')`""); $cwd = $repo }
  'gateway' {
    for ($i = 0; $i -lt 60 -and -not (Listening 8651); $i++) { Start-Sleep 2 }   # gateway łączy się z mostem przy starcie (narzędzia MCP)
    $exe = $hermes; $argv = @('-p', 'jarvis-desktop', 'gateway', 'run'); $cwd = $env:USERPROFILE
  }
}
$p = Start-Process -FilePath $exe -ArgumentList $argv -WorkingDirectory $cwd -WindowStyle Hidden -PassThru `
  -RedirectStandardOutput (Join-Path $logs "$Service.out.log") -RedirectStandardError (Join-Path $logs "$Service.err.log")
$p.WaitForExit()   # zadanie Harmonogramu trwa tak długo jak usługa
