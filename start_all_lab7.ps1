<#
.SYNOPSIS
  Starts all CampusConnect Lab 7 services persistently in background processes:
  - User Service on Port 3001
  - Product Service on Port 3002
  - Order Service on Port 3003
  - API Gateway on Port 4000 (Single Entry Point)
#>

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  CampusConnect - Lab 7: API Gateway & Microservices" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Stop any lingering node processes
Write-Host "Stopping existing node processes..." -ForegroundColor Gray
Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.Id -ne $PID } | ForEach-Object {
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
}
Start-Sleep -Seconds 1

Write-Host "Starting User Service (Port 3001)..." -ForegroundColor Yellow
Start-Process node -ArgumentList "server.js" -WorkingDirectory "d:\DAU\DAU_SEM3\wssoa\labs\lab5\user-service" -WindowStyle Hidden

Write-Host "Starting Product Service (Port 3002)..." -ForegroundColor Yellow
Start-Process node -ArgumentList "server.js" -WorkingDirectory "d:\DAU\DAU_SEM3\wssoa\labs\lab5\product-service" -WindowStyle Hidden

Write-Host "Starting Order Service (Port 3003)..." -ForegroundColor Yellow
Start-Process node -ArgumentList "server.js" -WorkingDirectory "d:\DAU\DAU_SEM3\wssoa\labs\lab5\order-service" -WindowStyle Hidden

Start-Sleep -Seconds 2

Write-Host "Starting API Gateway (Port 4000)..." -ForegroundColor Yellow
Start-Process node -ArgumentList "server.js" -WorkingDirectory "d:\DAU\DAU_SEM3\wssoa\labs\lab5\api-gateway" -WindowStyle Hidden

Start-Sleep -Seconds 3

Write-Host "`nVerifying Health Checks:" -ForegroundColor Cyan
$services = @(
    @{ Name = "API Gateway"; Url = "http://localhost:4000/health" },
    @{ Name = "User Service"; Url = "http://localhost:3001/health" },
    @{ Name = "Product Service"; Url = "http://localhost:3002/health" },
    @{ Name = "Order Service"; Url = "http://localhost:3003/health" }
)

foreach ($svc in $services) {
    try {
        $res = Invoke-RestMethod -Uri $svc.Url -TimeoutSec 4
        Write-Host "  [OK] $($svc.Name): $($res.status)" -ForegroundColor Green
    } catch {
        Write-Host "  [WAIT] $($svc.Name) still warming up..." -ForegroundColor Yellow
    }
}

Write-Host "`nAll 4 services are running persistently in the background!" -ForegroundColor Green
Write-Host "API Gateway is listening on: http://localhost:4000" -ForegroundColor Cyan
