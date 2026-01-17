# ScheduleRight Twilio SMS test script
# Requires TWILIO_* env vars configured and server running.

$serverUrl = "http://localhost:5710/api/v1"
$email = "admin@example.com"
$password = "admin123"
$testPhone = "+15551234567"
$message = "ScheduleRight test message"

Write-Host "1) Logging in..." -ForegroundColor Cyan
$loginResponse = Invoke-WebRequest -Uri "$serverUrl/auth/login" `
  -Method POST `
  -Headers @{ "Content-Type" = "application/json" } `
  -Body (@{ email = $email; password = $password } | ConvertTo-Json)

$loginData = $loginResponse.Content | ConvertFrom-Json
$jwtToken = $loginData.accessToken

if (-not $jwtToken) {
  Write-Host "Login failed. Check credentials." -ForegroundColor Red
  exit 1
}

Write-Host "✓ Logged in" -ForegroundColor Green

Write-Host "`n2) Checking Twilio status..." -ForegroundColor Cyan
$statusResponse = Invoke-WebRequest -Uri "$serverUrl/reminders/twilio-status" `
  -Method GET `
  -Headers @{ "Authorization" = "Bearer $jwtToken" }

Write-Host $statusResponse.Content

Write-Host "`n3) Sending test SMS..." -ForegroundColor Cyan
$sendResponse = Invoke-WebRequest -Uri "$serverUrl/reminders/send" `
  -Method POST `
  -Headers @{ "Content-Type" = "application/json"; "Authorization" = "Bearer $jwtToken" } `
  -Body (@{ phoneNumber = $testPhone; message = $message } | ConvertTo-Json)

Write-Host $sendResponse.Content
