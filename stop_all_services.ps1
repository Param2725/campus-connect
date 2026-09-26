<#
.SYNOPSIS
  Stops all running Node.js microservice and gateway processes.
#>

Write-Host "Stopping all CampusConnect services..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.Id -ne $PID } | ForEach-Object {
    Write-Host "  Stopping node process PID $($_.Id)..." -ForegroundColor Gray
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
}
Get-Job | Stop-Job -ErrorAction SilentlyContinue
Get-Job | Remove-Job -ErrorAction SilentlyContinue
Write-Host "All background services stopped." -ForegroundColor Green
