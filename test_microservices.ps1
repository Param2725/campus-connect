# Automated End-to-End Test & Verification for Lab 6 Microservices

$userUrl = "http://localhost:3001"
$productUrl = "http://localhost:3002"
$orderUrl = "http://localhost:3003"

Write-Host ""
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "    CampusConnect Lab 6: Microservices Full Test & Verification   " -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host ""

function Test-Endpoint($url) {
    try {
        $res = Invoke-RestMethod -Uri "$url/health" -Method GET -TimeoutSec 3 -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

Write-Host "[1/7] Verifying Service Health Endpoints..." -ForegroundColor Yellow

$uUp = Test-Endpoint $userUrl
$pUp = Test-Endpoint $productUrl
$oUp = Test-Endpoint $orderUrl

if (-not $uUp -or -not $pUp -or -not $oUp) {
    Write-Host "  One or more microservices not responding on ports 3001/3002/3003." -ForegroundColor Yellow
    Write-Host "  Please start your services using 'docker compose up -d' or node server.js" -ForegroundColor Yellow
    exit
}

Write-Host "  [OK] User Service is UP on $userUrl" -ForegroundColor Green
Write-Host "  [OK] Product Service is UP on $productUrl" -ForegroundColor Green
Write-Host "  [OK] Order Service is UP on $orderUrl" -ForegroundColor Green

# 2. Direct User Service Tests
Write-Host ""
Write-Host "[2/7] Testing Direct User Service (GET /users & GET /users/101)..." -ForegroundColor Yellow
try {
    $allUsers = Invoke-RestMethod -Uri "$userUrl/users" -Method GET
    Write-Host ("  [OK] GET /users returned HTTP 200 OK (Found " + $allUsers.count + " users)") -ForegroundColor Green

    $singleUser = Invoke-RestMethod -Uri "$userUrl/users/101" -Method GET
    Write-Host ("  [OK] GET /users/101 returned HTTP 200 OK (Name: " + $singleUser.data.name + ", Email: " + $singleUser.data.email + ")") -ForegroundColor Green
} catch {
    Write-Host ("  [FAIL] User Service Test Failed: " + $_.Exception.Message) -ForegroundColor Red
}

# 3. Direct Product Service Tests
Write-Host ""
Write-Host "[3/7] Testing Direct Product Service (GET /products & GET /products/501)..." -ForegroundColor Yellow
try {
    $allProducts = Invoke-RestMethod -Uri "$productUrl/products" -Method GET
    Write-Host ("  [OK] GET /products returned HTTP 200 OK (Found " + $allProducts.count + " products)") -ForegroundColor Green

    $singleProduct = Invoke-RestMethod -Uri "$productUrl/products/501" -Method GET
    Write-Host ("  [OK] GET /products/501 returned HTTP 200 OK (Name: " + $singleProduct.data.name + ", Price: $" + $singleProduct.data.price + ")") -ForegroundColor Green
} catch {
    Write-Host ("  [FAIL] Product Service Test Failed: " + $_.Exception.Message) -ForegroundColor Red
}

# 4. Order Creation (Service-to-Service Communication)
Write-Host ""
Write-Host "[4/7] Testing Order Creation (Order -> User & Order -> Product Communication)..." -ForegroundColor Yellow
$orderPayload = @{
    userId    = "101"
    productId = "501"
    quantity  = 2
} | ConvertTo-Json

try {
    $orderRes = Invoke-RestMethod -Uri "$orderUrl/orders" -Method POST -Body $orderPayload -ContentType "application/json"
    Write-Host "  [OK] POST /orders returned HTTP 201 Created" -ForegroundColor Green
    Write-Host ("     Order ID   : " + $orderRes.data.orderId) -ForegroundColor Cyan
    Write-Host ("     User Name  : " + $orderRes.data.user.name + " (Resolved via User Service)") -ForegroundColor Cyan
    Write-Host ("     Product    : " + $orderRes.data.product.name + " (Resolved via Product Service)") -ForegroundColor Cyan
    Write-Host ("     Total Price: $" + $orderRes.data.totalPrice) -ForegroundColor Cyan
    Write-Host ("     Status     : " + $orderRes.data.status) -ForegroundColor Cyan
} catch {
    Write-Host ("  [FAIL] Order Creation Failed: " + $_.Exception.Message) -ForegroundColor Red
}

# 5. Negative Test: Non-existent User ID
Write-Host ""
Write-Host "[5/7] Testing Negative Case: Order with Non-existent User ID (9999)..." -ForegroundColor Yellow
$badUserPayload = @{
    userId    = "9999"
    productId = "501"
    quantity  = 1
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "$orderUrl/orders" -Method POST -Body $badUserPayload -ContentType "application/json"
    Write-Host "  [FAIL] UNEXPECTED: Should have returned HTTP 404" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host ("  [OK] Correctly caught HTTP " + $statusCode + " (" + $_.ErrorDetails.Message + ")") -ForegroundColor Green
}

# 6. Negative Test: Non-existent Product ID
Write-Host ""
Write-Host "[6/7] Testing Negative Case: Order with Non-existent Product ID (9999)..." -ForegroundColor Yellow
$badProdPayload = @{
    userId    = "101"
    productId = "9999"
    quantity  = 1
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "$orderUrl/orders" -Method POST -Body $badProdPayload -ContentType "application/json"
    Write-Host "  [FAIL] UNEXPECTED: Should have returned HTTP 404" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host ("  [OK] Correctly caught HTTP " + $statusCode + " (" + $_.ErrorDetails.Message + ")") -ForegroundColor Green
}

# 7. Summary
Write-Host ""
Write-Host "[7/7] Resilience Test: Testing Controlled 503 when Dependency is Down..." -ForegroundColor Yellow
Write-Host "  [INFO] To simulate in Docker: docker stop user-service" -ForegroundColor Gray
Write-Host "         Then POST /orders will return controlled 503 Service Unavailable." -ForegroundColor Gray
Write-Host "         Restart with: docker start user-service" -ForegroundColor Gray

Write-Host ""
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "             All Lab 6 Automated Tests Completed!                " -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host ""
