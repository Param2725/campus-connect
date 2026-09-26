$body = '{"name":"","email":"invalid-email","course":"","semester":-2}'
try {
    $r = Invoke-RestMethod -Uri 'http://localhost:3000/students' -Method POST -Body $body -ContentType 'application/json'
    $r | ConvertTo-Json
} catch {
    $_.ErrorDetails.Message
}
