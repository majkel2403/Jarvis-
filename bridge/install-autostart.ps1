<#
.SYNOPSIS
  Autostart Jarvis OS: strona :4000 i most :8651. Gateway Hermesa jest własnością Hermesa (:8642).
#>
param([switch]$Remove)
$ErrorActionPreference = 'Stop'
$names = [ordered]@{ 'JarvisOS-Site' = 'site'; 'JarvisOS-Bridge' = 'bridge'; 'JarvisOS-OpenTab' = 'tab' }
$obsolete = 'JarvisOS-DesktopGateway'
if ($Remove) {
  foreach ($n in @($names.Keys) + @('JarvisOS-GatewayRestart', $obsolete)) {
    Unregister-ScheduledTask -TaskName $n -Confirm:$false -ErrorAction SilentlyContinue
    Write-Host "Usunięto: $n"
  }
  return
}
$runner = Join-Path $PSScriptRoot 'run-service.ps1'
$hermes = Join-Path $env:USERPROFILE '.hermes\bin\hermes.exe'
foreach ($f in $runner, (Join-Path $env:USERPROFILE '.hermes\hermes-agent\venv\Scripts\python.exe'), $hermes) { if (-not (Test-Path $f)) { throw "Brak pliku: $f" } }

# Konwergencja ze starej architektury: standalone jarvis-desktop :8643 nie może być już nadzorowany.
Unregister-ScheduledTask -TaskName $obsolete -Confirm:$false -ErrorAction SilentlyContinue

$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew
$logon = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$watchdog = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 5)
$ps = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$repo = Split-Path -Parent $PSScriptRoot
foreach ($n in $names.Keys) {
  $a = New-ScheduledTaskAction -Execute $ps -WorkingDirectory $repo -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$runner`" -Service $($names[$n])"
  $triggers = if ($names[$n] -eq 'tab') { @($logon) } else { @($logon, $watchdog) }
  Register-ScheduledTask -TaskName $n -Action $a -Trigger $triggers -Settings $settings -Description "Jarvis OS: $($names[$n])" -Force | Out-Null
}
$restartScript = Join-Path $PSScriptRoot 'restart-gateway.ps1'
$restart = New-ScheduledTaskAction -Execute $ps -WorkingDirectory $repo -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$restartScript`""
Register-ScheduledTask -TaskName 'JarvisOS-GatewayRestart' -Action $restart -Settings $settings -Description 'Jarvis OS: bezpieczny restart host gatewaya Hermesa' -Force | Out-Null
Write-Host "Zarejestrowano: $($names.Keys -join ', '), JarvisOS-GatewayRestart. Hermes host gateway :8642 pozostaje zarządzany przez natywny autostart Hermesa."
