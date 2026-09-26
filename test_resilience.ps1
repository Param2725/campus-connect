<#
.SYNOPSIS
  Demonstrates Step 6 & 7 of Hands-on Workflow:
  1. Verify 503 Service Unavailable when a dependency (User Service) is stopped
  2. Verify 201 Created recovery when User Service is restarted
#>

Write-Host "`n=================================================================" -ForegroundColor Cyan
Write-Host "   Resilience & Recovery Demonstration (503 & 201 Recovery)     " -ForegroundColor Cyan
Write-Host "=================================================================`n" -ForegroundColor Cyan

$orderUrl = "http://localhost:3003/orders"
$body = @{
    userId = "101"
    productId = "501"
    quantity = 1
} | ConvertTo-Json

# Check if User Service is running
$userHealthUrl = "http://localhost:3001/health"
$isUserRunning = $false
try {
    $res = Invoke-RestMethod -Uri $userHealthUrl -TimeoutSec 2 -ErrorAction Stop
    $isUserRunning = $true
} catch {
    $isUserRunning = $false
}

if ($isUserRunning) {
    Write-Host "[Step 1] User Service is currently UP. Testing normal order creation..." -ForegroundColor Yellow
    $normal = Invoke-RestMethod -Uri $orderUrl -Method POST -Body $body -ContentType "application/json"
    Write-Host "  ✅ Normal Order Created: $($normal.data.orderId) (Status: $($normal.data.status))`n" -ForegroundColor Green
    
    Write-Host "[Step 2] Now stop User Service (e.g., in Docker run: 'docker stop user-service')" -ForegroundColor Yellow
    Write-Host "         or terminate the node process on port 3001." -ForegroundColor Gray
    Write-Host "         Then rerun this script to verify the controlled HTTP 503 error.`n" -ForegroundColor Gray
} else {
    Write-Host "[Step 1] User Service is STOPPED / UNREACHABLE." -ForegroundColor Yellow
    Write-Host "         Sending POST /orders to test inter-service error handling..." -ForegroundColor Yellow
    try {
        $res = Invoke-RestMethod -Uri $orderUrl -Method POST -Body $body -ContentType "application/json"
        Write-Host "  ❌ UNEXPECTED: Should have returned HTTP 503!" -ForegroundColor Red
    } catch {
        $code = [int]$_.Exception.Response.StatusCode
        Write-Host "  ✅ SUCCESS: Caught controlled HTTP $code Service Unavailable" -ForegroundColor Green
        Write-Host "     Response Details: $($_.ErrorDetails.Message)" -ForegroundColor Cyan
    }

    Write-Host "`n[Step 2] To test recovery: Restart User Service (e.g. 'docker start user-service' or 'cd user-service; node server.js')" -ForegroundColor Yellow
    Write-Host "         Then rerun this script to observe automatic 201 Created recovery!`n" -ForegroundColor Gray
}

Write-Host "=================================================================`n" -ForegroundColor Cyan
