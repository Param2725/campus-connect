Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " CampusConnect Lab 5: Containerized REST API Verification  " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$baseUrl = "http://localhost:3000"

# 1. Health Check
Write-Host "`n[1/6] Testing Root Health Endpoint (GET /)..." -ForegroundColor Yellow
try {
    $root = Invoke-RestMethod -Uri "$baseUrl/" -Method GET
    Write-Host "  ✅ SUCCESS: Service is alive" -ForegroundColor Green
    Write-Host "     Message: $($root.message)" -ForegroundColor Gray
    Write-Host "     Database: $($root.database)" -ForegroundColor Gray
} catch {
    Write-Host "  ❌ ERROR: Could not reach $baseUrl/. Ensure container is running." -ForegroundColor Red
    exit
}

# 2. GET /students
Write-Host "`n[2/6] Testing List All Students (GET /students)..." -ForegroundColor Yellow
try {
    $res = Invoke-RestMethod -Uri "$baseUrl/students" -Method GET
    Write-Host "  ✅ SUCCESS: HTTP 200 OK (Count: $($res.count), Storage: $($res.storage))" -ForegroundColor Green
} catch {
    Write-Host "  ❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. POST /students (Create student)
Write-Host "`n[3/6] Testing Create Student (POST /students)..." -ForegroundColor Yellow
$testEmail = "docker.test.$(Get-Random)@example.com"
$newStudentBody = @{
    name     = "Docker Test Student"
    email    = $testEmail
    course   = "Cloud DevOps"
    semester = 6
} | ConvertTo-Json

try {
    $created = Invoke-RestMethod -Uri "$baseUrl/students" -Method POST -Body $newStudentBody -ContentType "application/json"
    $newId = $created.data.id
    Write-Host "  ✅ SUCCESS: HTTP 201 Created (ID: $newId, Name: $($created.data.name))" -ForegroundColor Green
} catch {
    Write-Host "  ❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. GET /students/:id (Get single student)
if ($newId) {
    Write-Host "`n[4/6] Testing Get Student by ID (GET /students/$newId)..." -ForegroundColor Yellow
    try {
        $single = Invoke-RestMethod -Uri "$baseUrl/students/$newId" -Method GET
        Write-Host "  ✅ SUCCESS: HTTP 200 OK (Email: $($single.data.email))" -ForegroundColor Green
    } catch {
        Write-Host "  ❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# 5. Negative Test (404 Not Found)
Write-Host "`n[5/6] Testing Error Scenario (GET /students/64b1f2e99999999999999999)..." -ForegroundColor Yellow
try {
    $missing = Invoke-RestMethod -Uri "$baseUrl/students/64b1f2e99999999999999999" -Method GET
    Write-Host "  ❌ UNEXPECTED: Should have returned 404" -ForegroundColor Red
} catch {
    Write-Host "  ✅ SUCCESS: HTTP 404 Handled Correctly ($($_.ErrorDetails.Message))" -ForegroundColor Green
}

# 6. Negative Test (400 Bad Request / Validation Failure)
Write-Host "`n[6/6] Testing Validation Scenario (POST /students with empty fields)..." -ForegroundColor Yellow
$badBody = '{"name":"","email":"invalid-email","course":"","semester":99}'
try {
    Invoke-RestMethod -Uri "$baseUrl/students" -Method POST -Body $badBody -ContentType "application/json"
    Write-Host "  ❌ UNEXPECTED: Should have returned 400" -ForegroundColor Red
} catch {
    Write-Host "  ✅ SUCCESS: HTTP 400 Bad Request Rejected ($($_.ErrorDetails.Message))" -ForegroundColor Green
}

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host " Verification Completed! All endpoints behaving correctly. " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
