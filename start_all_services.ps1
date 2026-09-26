<#
.SYNOPSIS
  Helper script to launch all 3 microservices locally in background jobs or standalone terminals.
#>

Write-Host "Starting CampusConnect Microservices locally..." -ForegroundColor Cyan

$userJob = Start-Job -ScriptBlock { Set-Location "d:\DAU\DAU_SEM3\wssoa\labs\lab5\user-service"; node server.js }
$prodJob = Start-Job -ScriptBlock { Set-Location "d:\DAU\DAU_SEM3\wssoa\labs\lab5\product-service"; node server.js }
$ordJob  = Start-Job -ScriptBlock { Set-Location "d:\DAU\DAU_SEM3\wssoa\labs\lab5\order-service"; node server.js }

Start-Sleep -Seconds 3

Write-Host "Jobs started: User (Job $($userJob.Id)), Product (Job $($prodJob.Id)), Order (Job $($ordJob.Id))" -ForegroundColor Green
Write-Host "Checking health..." -ForegroundColor Yellow

try {
    $u = Invoke-RestMethod "http://localhost:3001/health"
    Write-Host "  ✅ User Service: $($u.status)" -ForegroundColor Green
    $p = Invoke-RestMethod "http://localhost:3002/health"
    Write-Host "  ✅ Product Service: $($p.status)" -ForegroundColor Green
    $o = Invoke-RestMethod "http://localhost:3003/health"
    Write-Host "  ✅ Order Service: $($o.status)" -ForegroundColor Green
} catch {
    Write-Host "Error checking health: $($_.Exception.Message)" -ForegroundColor Red
}
