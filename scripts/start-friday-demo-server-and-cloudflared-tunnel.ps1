# Friday demo startup script — PowerShell version
# Usage  : .\scripts\start-friday-demo-server-and-cloudflared-tunnel.ps1
# Bash   : bash scripts/start-friday-demo-server-and-cloudflared-tunnel.sh
#
# Starts:
#   [1] Domain Reputation Monitor  — Hono, port 9041
#   [2] Friday Demo Hub server     — Hono, port 9030  (plans/ gallery + /product/* proxy)
#   [3] Cloudflared tunnel         — exposes port 9030 via https://friday.binhnguyen.io.vn

# Script lives in scripts/ — project root is one level up
$projectRoot  = Split-Path $PSScriptRoot -Parent
$port         = 9030
$tunnelConfig = "$env:USERPROFILE\.cloudflared\config-friday.yml"

Write-Host "=== iNET Friday Demo Server ===" -ForegroundColor Cyan
Write-Host "Root     : $projectRoot" -ForegroundColor Gray
Write-Host "Hub port : $port" -ForegroundColor Gray
Write-Host "URL      : https://friday.binhnguyen.io.vn" -ForegroundColor Green
Write-Host ""

$jobs = @()

# Kiem tra port 9030 da duoc dung chua
$portInUse = netstat -ano | Select-String ":$port " | Select-String "LISTENING"
if ($portInUse) {
    Write-Host "[WARN] Port $port dang duoc dung. Tat process cu..." -ForegroundColor Yellow
    $oldPid = ($portInUse -split '\s+')[-1]
    Stop-Process -Id $oldPid -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

# Helper: wait until port is listening or timeout
function Wait-Port {
    param([int]$Port, [int]$TimeoutSec = 15)
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    while ($sw.Elapsed.TotalSeconds -lt $TimeoutSec) {
        $conn = netstat -ano 2>$null | Select-String ":$Port " | Select-String "LISTENING"
        if ($conn) { return $true }
        Start-Sleep -Milliseconds 500
    }
    return $false
}

# [1/5] Domain Reputation Monitor — Hono API + frontend (port 9041)
Write-Host "[1/5] Khoi dong Domain Reputation Monitor (port 9041)..." -ForegroundColor Yellow
$repJob = Start-Job -ScriptBlock {
    param($dir)
    Set-Location $dir
    pnpm dev:domain-rep 2>&1
} -ArgumentList $projectRoot

if (-not (Wait-Port -Port 9041 -TimeoutSec 15)) {
    Write-Host "[ERROR] Domain Reputation Monitor khong start duoc (port 9041 timeout)." -ForegroundColor Red
    Write-Host "        Log:" -ForegroundColor Red
    Receive-Job $repJob | Select-Object -Last 10 | ForEach-Object { Write-Host "        $_" -ForegroundColor DarkRed }
    Stop-Job $repJob; Remove-Job $repJob
    exit 1
}
Write-Host "        Domain Reputation Monitor OK (port 9041)" -ForegroundColor Green
$jobs += $repJob

# [2/5] Email Auth Checker — Hono API + frontend (port 9042)
Write-Host "[2/5] Khoi dong Email Auth Checker (port 9042)..." -ForegroundColor Yellow
$emailJob = Start-Job -ScriptBlock {
    param($dir)
    Set-Location $dir
    pnpm dev:email-auth 2>&1
} -ArgumentList $projectRoot

if (-not (Wait-Port -Port 9042 -TimeoutSec 15)) {
    Write-Host "[WARN] Email Auth Checker khong start duoc (port 9042 timeout) — tiep tuc khong co san pham nay." -ForegroundColor Yellow
    Receive-Job $emailJob | Select-Object -Last 5 | ForEach-Object { Write-Host "       $_" -ForegroundColor DarkYellow }
    Stop-Job $emailJob; Remove-Job $emailJob
} else {
    Write-Host "        Email Auth Checker OK (port 9042)" -ForegroundColor Green
    $jobs += $emailJob
}

# [3/5] SSL Health Dashboard — Hono API + frontend (port 9043)
Write-Host "[3/5] Khoi dong SSL Health Dashboard (port 9043)..." -ForegroundColor Yellow
$sslJob = Start-Job -ScriptBlock {
    param($dir)
    Set-Location $dir
    pnpm dev:ssl-health 2>&1
} -ArgumentList $projectRoot

if (-not (Wait-Port -Port 9043 -TimeoutSec 15)) {
    Write-Host "[WARN] SSL Health Dashboard khong start duoc (port 9043 timeout) — tiep tuc khong co san pham nay." -ForegroundColor Yellow
    Receive-Job $sslJob | Select-Object -Last 5 | ForEach-Object { Write-Host "       $_" -ForegroundColor DarkYellow }
    Stop-Job $sslJob; Remove-Job $sslJob
} else {
    Write-Host "        SSL Health Dashboard OK (port 9043)" -ForegroundColor Green
    $jobs += $sslJob
}

# [4/5] Hub server — serve plans/ + reverse-proxy /product/* (port 9030)
Write-Host "[4/5] Khoi dong Hub server (port $port)..." -ForegroundColor Yellow
$hubJob = Start-Job -ScriptBlock {
    param($dir)
    Set-Location $dir
    pnpm dev:hub 2>&1
} -ArgumentList $projectRoot

if (-not (Wait-Port -Port $port -TimeoutSec 10)) {
    Write-Host "[ERROR] Hub server khong start duoc (port $port timeout)." -ForegroundColor Red
    Receive-Job $hubJob | Select-Object -Last 10 | ForEach-Object { Write-Host "        $_" -ForegroundColor DarkRed }
    foreach ($j in $jobs) { Stop-Job $j; Remove-Job $j }
    Stop-Job $hubJob; Remove-Job $hubJob
    exit 1
}
Write-Host "        Hub server OK (port $port)" -ForegroundColor Green
$jobs += $hubJob

Write-Host ""
Write-Host "[OK] Tat ca servers dang chay:" -ForegroundColor Green
Write-Host "     Demo Gallery       : https://friday.binhnguyen.io.vn/" -ForegroundColor Cyan
Write-Host "     Domain Monitor     : https://friday.binhnguyen.io.vn/product/domain-reputation/" -ForegroundColor Cyan
Write-Host "     Email Auth Checker : https://friday.binhnguyen.io.vn/product/email-auth-checker/" -ForegroundColor Cyan
Write-Host "     SSL Health Dashboard: https://friday.binhnguyen.io.vn/product/ssl-health-dashboard/" -ForegroundColor Cyan
Write-Host ""
Start-Process "https://friday.binhnguyen.io.vn"

# [5/5] Cloudflared tunnel (blocking — giu terminal mo)
Write-Host "[5/5] Khoi dong cloudflared tunnel..." -ForegroundColor Yellow
Write-Host "Nhan Ctrl+C de dung tat ca." -ForegroundColor Gray
Write-Host ""

try {
    cloudflared tunnel --config $tunnelConfig run friday
} finally {
    Write-Host "`n[STOP] Dang tat servers..." -ForegroundColor Red
    foreach ($j in $jobs) {
        Stop-Job  $j -ErrorAction SilentlyContinue
        Remove-Job $j -ErrorAction SilentlyContinue
    }
    Write-Host "[DONE] Da dung tat ca server." -ForegroundColor Gray
}
