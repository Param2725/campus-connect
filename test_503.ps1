$body = @{
    userId = "101"
    productId = "501"
    quantity = 1
} | ConvertTo-Json

try {
    $res = Invoke-RestMethod -Uri "http://localhost:3003/orders" -Method POST -Body $body -ContentType "application/json"
    Write-Host "Unexpected Success: $($res)" -ForegroundColor Red
} catch {
    $code = [int]$_.Exception.Response.StatusCode
    Write-Host "Caught Expected Error Code: $code" -ForegroundColor Green
    Write-Host "Response Body: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
}
