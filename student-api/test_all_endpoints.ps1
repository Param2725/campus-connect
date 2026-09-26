Write-Host "--- Testing Lab 4 Student REST API ---" -ForegroundColor Cyan

# 1. GET /
$root = Invoke-RestMethod -Uri 'http://localhost:3000/' -Method GET
Write-Host "[200] GET / -> Message: $($root.message)" -ForegroundColor Green

# 2. GET /students
$all = Invoke-RestMethod -Uri 'http://localhost:3000/students' -Method GET
Write-Host "[200] GET /students -> Count: $($all.count), Storage: $($all.storage)" -ForegroundColor Green

# 3. POST /students (Valid)
$validBody = '{"name":"Kavya Patel","email":"kavya.lab4@example.com","course":"Cloud Computing","semester":4}'
$created = Invoke-RestMethod -Uri 'http://localhost:3000/students' -Method POST -Body $validBody -ContentType 'application/json'
Write-Host "[201] POST /students -> Created ID: $($created.data.id), Name: $($created.data.name)" -ForegroundColor Green

# 4. POST /students (Unique Email Constraint Duplicate)
try {
    Invoke-RestMethod -Uri 'http://localhost:3000/students' -Method POST -Body $validBody -ContentType 'application/json'
    Write-Host "[FAIL] Duplicate email was not rejected!" -ForegroundColor Red
} catch {
    Write-Host "[400] POST /students Duplicate Email -> $($_.ErrorDetails.Message)" -ForegroundColor Yellow
}

# 5. POST /students (Validation Failure - 400 Bad Request)
$badBody = '{"name":"","email":"not-an-email","course":"","semester":-5}'
try {
    Invoke-RestMethod -Uri 'http://localhost:3000/students' -Method POST -Body $badBody -ContentType 'application/json'
    Write-Host "[FAIL] Bad body was not rejected!" -ForegroundColor Red
} catch {
    Write-Host "[400] POST /students Bad Input -> $($_.ErrorDetails.Message)" -ForegroundColor Yellow
}

# 6. GET /students/999999999999 (404 Not Found)
try {
    Invoke-RestMethod -Uri 'http://localhost:3000/students/64b1f2e99999999999999999' -Method GET
    Write-Host "[FAIL] Missing student returned 200!" -ForegroundColor Red
} catch {
    Write-Host "[404] GET /students/:id Not Found -> $($_.ErrorDetails.Message)" -ForegroundColor Yellow
}

# 7. PATCH /students/:id
$createdId = $created.data.id
$patchBody = '{"semester":5}'
$patched = Invoke-RestMethod -Uri "http://localhost:3000/students/$createdId" -Method PATCH -Body $patchBody -ContentType 'application/json'
Write-Host "[200] PATCH /students/$createdId -> New Semester: $($patched.data.semester)" -ForegroundColor Green

# 8. DELETE /students/:id
$deleted = Invoke-RestMethod -Uri "http://localhost:3000/students/$createdId" -Method DELETE
Write-Host "[200] DELETE /students/$createdId -> Message: $($deleted.message)" -ForegroundColor Green

Write-Host "--- All API Tests Completed Successfully ---" -ForegroundColor Cyan
