# Bezpieczny restart JEDNEGO host gatewaya Hermesa (default multiplexer :8642).
$ErrorActionPreference = 'Continue'
$root = Join-Path $env:USERPROFILE '.hermes'
$profDir = Join-Path $root 'profiles\jarvis-desktop'
$hermes = Join-Path $root 'bin\hermes.exe'
$stateFile = Join-Path $root 'gateway_state.json'
$logs = Join-Path $env:USERPROFILE '.jarvis-os\logs'
$log = Join-Path $logs 'restart.log'
$env:HERMES_HOME = $root
New-Item -ItemType Directory -Force $logs | Out-Null

function Log($m) { "$(Get-Date -Format s) $m" | Out-File $log -Append -Encoding utf8 }
function Listening($p) { [bool](Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue) }

function Send-Telegram($text) {
    try {
        $kv = @{}
        Get-Content (Join-Path $profDir '.env') | Where-Object { $_ -match '^\s*([A-Z_]+)\s*=\s*(.*)$' } | ForEach-Object {
            $kv[$Matches[1]] = $Matches[2].Trim().Trim('"').Trim("'")
        }
        $token = $kv['TELEGRAM_BOT_TOKEN']
        $chat = $kv['TELEGRAM_HOME_CHANNEL']
        if (-not $token -or -not $chat) { return }
        Invoke-RestMethod -Method Post -Uri "https://api.telegram.org/bot$token/sendMessage" -Body @{ chat_id = $chat; text = $text } -TimeoutSec 15 | Out-Null
    } catch {
        Log "powiadomienie Telegram nieudane: $($_.Exception.Message)"
    }
}

Log '=== restart host gatewaya zlecony'
for ($i = 0; $i -lt 24; $i++) {
    try { $busy = (Get-Content $stateFile -Raw | ConvertFrom-Json).active_agents } catch { $busy = 0 }
    if (-not $busy) { break }
    if ($i -eq 0) { Log "czekam na $busy aktywnych rozmow (max 120 s)" }
    Start-Sleep -Seconds 5
}
if ($busy) {
    Log "BLAD: po 120 s nadal $busy aktywnych rozmow - restart anulowany"
    exit 2
}

Log 'hermes -p default gateway restart'
& $hermes -p default gateway restart 2>&1 | ForEach-Object { Log "  $_" }
if ($LASTEXITCODE -ne 0) {
    Log "BLAD: hermes gateway restart zakonczyl sie kodem $LASTEXITCODE"
}

$ok = $false
for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep 3
    try {
        $st = Get-Content $stateFile -Raw | ConvertFrom-Json
        $tg = $st.platforms.'jarvis-desktop:telegram'.state
        $served = @($st.served_profiles)
        if ((Listening 8642) -and $st.gateway_state -eq 'running' -and $tg -eq 'connected' -and $served -contains 'jarvis-desktop') {
            $ok = $true
            break
        }
    } catch { }
}

if ($ok) {
    Log "OK: host gateway :8642 running, telegram connected (pid $($st.pid))"
    Send-Telegram 'Jarvis: host gateway zrestartowany, jestem znow online.'
    exit 0
}
Log 'BLAD: host gateway nie potwierdzony po restarcie'
Send-Telegram 'Jarvis: restart host gatewaya nie zostal potwierdzony.'
exit 1
