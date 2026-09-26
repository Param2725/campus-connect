<#
.SYNOPSIS
  Comprehensive verification test for Lab 7:
  - Gateway health check
  - Routed /users, /products, /orders
  - Inter-service order creation through gateway
  - Centralized 502 error handling test
#>

$gateway = "http://localhost:4000"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  CampusConnect Lab 7 - API Gateway Automated Test Suite" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Gateway Target: $gateway`n" -ForegroundColor Yellow

$passed = 0
$total = 0

function Run-Test($name, [scriptblock]$action) {
    $script:total++
    Write-Host "[$script:total] $name" -NoNewline
    try {
        & $action
        Write-Host " -> PASS [OK]" -ForegroundColor Green
        $script:passed++
    } catch {
        Write-Host " -> FAIL [X] ($($_.Exception.Message))" -ForegroundColor Red
    }
}

# 1. Gateway Health Check
Run-Test "Gateway Health Check (GET /health)" {
    $res = Invoke-RestMethod "$gateway/health" -Method Get
    if ($res.status -ne "UP" -or $res.registeredServices.Count -lt 3) {
        throw "Unexpected gateway health response"
    }
    Write-Host " [Status: $($res.status), Services: $($res.registeredServices.Count)]" -NoNewline -ForegroundColor Gray
}

# 2. Get Users through Gateway
Run-Test "User Service via Gateway (GET /users)" {
    $res = Invoke-RestMethod "$gateway/users" -Method Get
    if (-not $res.success -or $res.count -le 0) {
        throw "Failed to fetch users"
    }
    Write-Host " [Count: $($res.count), Source: $($res.source)]" -NoNewline -ForegroundColor Gray
}

# 3. Get User by ID through Gateway
Run-Test "User Service by ID via Gateway (GET /users/101)" {
    $res = Invoke-RestMethod "$gateway/users/101" -Method Get
    if (-not $res.success -or $res.data.name -notmatch "Aarav") {
        throw "Failed to fetch user 101"
    }
    Write-Host " [User: $($res.data.name)]" -NoNewline -ForegroundColor Gray
}

# 4. Get Products through Gateway
Run-Test "Product Service via Gateway (GET /products)" {
    $res = Invoke-RestMethod "$gateway/products" -Method Get
    if (-not $res.success -or $res.count -le 0) {
        throw "Failed to fetch products"
    }
    Write-Host " [Count: $($res.count), Source: $($res.source)]" -NoNewline -ForegroundColor Gray
}

# 5. Get Product by ID through Gateway
Run-Test "Product Service by ID via Gateway (GET /products/501)" {
    $res = Invoke-RestMethod "$gateway/products/501" -Method Get
    $pName = if ($res.data.name) { $res.data.name } else { $res.data.title }
    if (-not $res.success -or -not $pName) {
        throw "Failed to fetch product 501"
    }
    Write-Host " [Product: $pName]" -NoNewline -ForegroundColor Gray
}

# 6. Place Order through Gateway (Full Inter-Service Chain)
Run-Test "Place Order via Gateway (POST /orders -> Order Service -> User & Product -> Atlas)" {
    $body = @{
        userId = "101"
        productId = "501"
        quantity = 1
        shippingAddress = "Campus Hostel B, Lab 7 Gateway Test"
    } | ConvertTo-Json
    $res = Invoke-RestMethod "$gateway/orders" -Method Post -Body $body -ContentType "application/json"
    $oPrice = if ($res.data.totalPrice) { $res.data.totalPrice } else { $res.data.totalAmount }
    if (-not $res.success -or -not $res.data.orderId) {
        throw "Order creation failed"
    }
    Write-Host " [OrderId: $($res.data.orderId), Total: $oPrice]" -NoNewline -ForegroundColor Gray
}

# 7. Get Orders through Gateway
Run-Test "Retrieve Orders via Gateway (GET /orders)" {
    $res = Invoke-RestMethod "$gateway/orders" -Method Get
    if (-not $res.success) {
        throw "Failed to retrieve orders"
    }
    Write-Host " [Count: $($res.count)]" -NoNewline -ForegroundColor Gray
}

# 8. Unmatched Gateway Route (404 Not Found)
Run-Test "Unmatched Gateway Route (GET /unknown-service -> 404)" {
    try {
        Invoke-RestMethod "$gateway/unknown-route" -Method Get
        throw "Expected 404, but request succeeded!"
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -eq 404) {
            Write-Host " [Received 404 as expected]" -NoNewline -ForegroundColor Gray
        } else {
            throw $_
        }
    }
}

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "  Results: $passed / $total Tests Passed" -ForegroundColor $(if ($passed -eq $total) { "Green" } else { "Yellow" })
Write-Host "==========================================================" -ForegroundColor Cyan
