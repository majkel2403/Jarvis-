<#
.SYNOPSIS
  Autostart Jarvis OS przy logowaniu do Windows: strona :4000, most MCP i Hermes jarvis-desktop.

.DESCRIPTION
  Tworzy cztery zadania w Harmonogramie zadań bieżącego użytkownika (bez uprawnień administratora), każde przez
  bridge\run-service.ps1 w ukrytym oknie, z logami w %USERPROFILE%\.jarvis-os\logs:
    JarvisOS-Site            - strona Jarvis OS (python bridge\serve_site.py 4000, Host walidowany)
    JarvisOS-Bridge          - most MCP + agenci (bridge\jarvis_bridge.py, :8651)
    JarvisOS-DesktopGateway  - Hermes, profil jarvis-desktop (:8643), po starcie mostu
    JarvisOS-OpenTab         - jednorazowo otwiera kartę :4000, TYLKO gdy żadna nie jest połączona z mostem
                               (żeby polecenia pulpitu z Telegrama/API miały gdzie się wykonać)
  Usługa, która już działa, nie jest uruchamiana drugi raz. Hermes działa natywnie w Windows (bez WSL). Usunięcie: -Remove.

.EXAMPLE
  .\bridge\install-autostart.ps1
  .\bridge\install-autostart.ps1 -Remove
#>
param([switch]$Remove)
$ErrorActionPreference = 'Stop'
$names = [ordered]@{ 'JarvisOS-Site' = 'site'; 'JarvisOS-Bridge' = 'bridge'; 'JarvisOS-DesktopGateway' = 'gateway'; 'JarvisOS-OpenTab' = 'tab' }
if ($Remove) { foreach ($n in $names.Keys) { Unregister-ScheduledTask -TaskName $n -Confirm:$false -ErrorAction SilentlyContinue; Write-Host "Usunięto: $n" }; return }

$runner = Join-Path $PSScriptRoot 'run-service.ps1'
foreach ($f in $runner, (Join-Path $env:USERPROFILE '.hermes\hermes-agent\venv\Scripts\python.exe'), (Join-Path $env:USERPROFILE '.hermes\bin\hermes.exe')) { if (-not (Test-Path $f)) { throw "Brak pliku: $f" } }

$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew
$trigger  = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$ps = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'   # pełna ścieżka: Harmonogram bez niej zgłaszał 0x80070002
foreach ($n in $names.Keys) {
  $a = New-ScheduledTaskAction -Execute $ps -WorkingDirectory (Split-Path -Parent $PSScriptRoot) -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$runner`" -Service $($names[$n])"
  Register-ScheduledTask -TaskName $n -Action $a -Trigger $trigger -Settings $settings -Description "Jarvis OS: $($names[$n])" -Force | Out-Null
}
Write-Host "Zarejestrowano zadania: $($names.Keys -join ', ') — ruszą przy następnym logowaniu."
Write-Host "Uruchomić teraz:  $(($names.Keys | ForEach-Object { "Start-ScheduledTask -TaskName $_" }) -join '; ')"
Write-Host "Usunąć:           .\bridge\install-autostart.ps1 -Remove"
