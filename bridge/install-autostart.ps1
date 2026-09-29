<#
.SYNOPSIS
  (Opcjonalne) Autostart mostu Jarvis OS i gatewaya jarvis-desktop przy logowaniu do Windows.

.DESCRIPTION
  Tworzy dwa zadania w Harmonogramie zadań bieżącego użytkownika (bez uprawnień administratora):
    JarvisOS-Bridge          - bridge\jarvis_bridge.py
    JarvisOS-DesktopGateway  - hermes -p jarvis-desktop gateway run   (start 20 s po moście)
  Hermes działa natywnie w Windows (bez WSL). Usunięcie: -Remove.

.EXAMPLE
  .\bridge\install-autostart.ps1
  .\bridge\install-autostart.ps1 -Remove
#>
param([switch]$Remove)
$ErrorActionPreference = 'Stop'
$names = 'JarvisOS-Bridge', 'JarvisOS-DesktopGateway'
if ($Remove) { foreach ($n in $names) { Unregister-ScheduledTask -TaskName $n -Confirm:$false -ErrorAction SilentlyContinue; Write-Host "Usunięto: $n" }; return }

$install = Join-Path $env:USERPROFILE '.hermes'
$py      = Join-Path $install 'hermes-agent\venv\Scripts\python.exe'
$hermes  = Join-Path $install 'bin\hermes.exe'
$bridge  = Join-Path (Split-Path -Parent $PSScriptRoot) 'bridge\jarvis_bridge.py'
foreach ($f in $py, $hermes, $bridge) { if (-not (Test-Path $f)) { throw "Brak pliku: $f" } }

$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit ([TimeSpan]::Zero)
$trigger  = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME

$a1 = New-ScheduledTaskAction -Execute $py -Argument "`"$bridge`""
Register-ScheduledTask -TaskName $names[0] -Action $a1 -Trigger $trigger -Settings $settings -Description 'Most Jarvis OS <-> Hermes (MCP)' -Force | Out-Null

$a2 = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -WindowStyle Hidden -Command `"Start-Sleep 20; & '$hermes' -p jarvis-desktop gateway run`""
Register-ScheduledTask -TaskName $names[1] -Action $a2 -Trigger $trigger -Settings $settings -Description 'Gateway Hermesa: profil jarvis-desktop' -Force | Out-Null

Write-Host "Zarejestrowano zadania: $($names -join ', ') — ruszą przy następnym logowaniu."
Write-Host "Uruchomić teraz:  Start-ScheduledTask -TaskName $($names[0]); Start-ScheduledTask -TaskName $($names[1])"
Write-Host "Usunąć:           .\bridge\install-autostart.ps1 -Remove"
