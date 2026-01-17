# Twilio SMS Integration Guide

This guide explains how to set up and use the SMS reminder system powered by Twilio.

## Setup

### Prerequisites

1. **Twilio Account**
   - Create a free account at [twilio.com](https://www.twilio.com/console)
   - Verify your phone number for testing
   - Get your:
     - Account SID
     - Auth Token
     - Twilio Phone Number (assigned to your account)

2. **Environment Variables**
   Add these to your `.env` file in the server root:

   ```env
   TWILIO_ACCOUNT_SID=your_account_sid_here
   TWILIO_AUTH_TOKEN=your_auth_token_here
   TWILIO_PHONE_NUMBER=+1234567890
   TWILIO_VERIFY_SID=your_verify_sid_here  # Optional, for SMS OTP
   ```

3. **Restart Server**
   ```bash
   # Kill existing server process
   # Restart with: pnpm --filter @scheduleright/server run dev
   ```

---

## API Endpoints

### 1. Send SMS Reminder

**Endpoint:** `POST /api/v1/reminders/send`

**Authentication:** Required (JWT Bearer token)  
**Roles:** ADMIN, STAFF

**Request Body:**
```json
{
  "phoneNumber": "+14155552671",
  "message": "Hello John, your appointment is scheduled for Jan 20 at 2:00 PM.",
  "bookingId": "booking:123"  // Optional, for tracking
}
```

**Validation:**
- `phoneNumber`: Must be E.164 format (e.g., `+1234567890`)
- `message`: 1-160 characters
- `bookingId`: Optional string

**Success Response (200):**
```json
{
  "success": true,
  "messageId": "SM123abc456def789",
  "status": "queued",
  "phoneNumber": "+14155552671",
  "message": "Hello John, your appointment is scheduled for Jan 20 at 2:00 PM.",
  "bookingId": "booking:123",
  "sentAt": "2025-01-16T12:34:56.000Z",
  "timestamp": "2025-01-16T12:34:56.000Z"
}
```

**Error Responses:**

**503 - Twilio Not Configured**
```json
{
  "error": "Twilio is not configured",
  "code": "TWILIO_NOT_CONFIGURED",
  "statusCode": 503,
  "details": {
    "missingConfig": [
      "TWILIO_ACCOUNT_SID",
      "TWILIO_AUTH_TOKEN",
      "TWILIO_PHONE_NUMBER"
    ]
  }
}
```

**400 - Invalid Request**
```json
{
  "error": "Invalid request: Invalid E.164 phone number format",
  "code": "VALIDATION_ERROR",
  "statusCode": 400
}
```

**400 - Twilio API Error**
```json
{
  "error": "Failed to send SMS via Twilio",
  "code": "TWILIO_SMS_FAILED",
  "statusCode": 400,
  "details": {
    "twilioErrorCode": 21211,
    "twilioErrorMessage": "The 'To' number +1invalid is not a valid phone number."
  }
}
```

---

### 2. Check Twilio Status

**Endpoint:** `GET /api/v1/reminders/twilio-status`

**Authentication:** Required (JWT Bearer token)

**Success Response (200):**
```json
{
  "twilioConfigured": true,
  "remindersEnabled": true,
  "phoneNumber": "+1234567890",
  "message": "Twilio SMS configured and ready",
  "timestamp": "2025-01-16T12:34:56.000Z"
}
```

**Response when not configured:**
```json
{
  "twilioConfigured": false,
  "remindersEnabled": false,
  "phoneNumber": null,
  "message": "Twilio SMS not configured",
  "timestamp": "2025-01-16T12:34:56.000Z"
}
```

---

## Testing

### 1. Using cURL

```bash
# Get JWT token first (login)
curl -X POST http://localhost:5710/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123"
  }' \
  -c cookies.txt

# Check Twilio status
curl -X GET http://localhost:5710/api/v1/reminders/twilio-status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -b cookies.txt

# Send test SMS
curl -X POST http://localhost:5710/api/v1/reminders/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -b cookies.txt \
  -d '{
    "phoneNumber": "+12025551234",
    "message": "Hello, this is a test message from ScheduleRight!"
  }'
```

### 2. Using PowerShell Script

Create `test-sms-endpoints.ps1`:

```powershell
# Configuration
$serverUrl = "http://localhost:5710/api/v1"
$email = "admin@example.com"
$password = "admin123"

# Step 1: Get login token
Write-Host "1. Logging in..." -ForegroundColor Cyan
$loginResponse = Invoke-WebRequest -Uri "$serverUrl/auth/login" `
  -Method POST `
  -Headers @{ "Content-Type" = "application/json" } `
  -Body (@{ email = $email; password = $password } | ConvertTo-Json) `
  -SessionVariable session

$loginData = $loginResponse.Content | ConvertFrom-Json
$jwtToken = $loginData.accessToken

Write-Host "✓ Logged in. Token: $($jwtToken.Substring(0, 20))..." -ForegroundColor Green

# Step 2: Check Twilio status
Write-Host "`n2. Checking Twilio status..." -ForegroundColor Cyan
$statusResponse = Invoke-WebRequest -Uri "$serverUrl/reminders/twilio-status" `
  -Method GET `
  -Headers @{ "Authorization" = "Bearer $jwtToken" } `
  -WebSession $session

$statusData = $statusResponse.Content | ConvertFrom-Json
Write-Host ($statusData | ConvertTo-Json -Depth 3) -ForegroundColor White

# Step 3: Send test SMS
if ($statusData.twilioConfigured) {
  Write-Host "`n3. Sending test SMS..." -ForegroundColor Cyan
  
  $smsBody = @{
    phoneNumber = "+12025551234"  # Replace with your test number
    message = "Test SMS from ScheduleRight at $(Get-Date -Format 'HH:mm:ss')"
  } | ConvertTo-Json
  
  $smsResponse = Invoke-WebRequest -Uri "$serverUrl/reminders/send" `
    -Method POST `
    -Headers @{ 
      "Content-Type" = "application/json"
      "Authorization" = "Bearer $jwtToken"
    } `
    -Body $smsBody `
    -WebSession $session
  
  $smsData = $smsResponse.Content | ConvertFrom-Json
  Write-Host ($smsData | ConvertTo-Json -Depth 3) -ForegroundColor Green
  Write-Host "`n✓ SMS sent! Check your phone for the message." -ForegroundColor Green
} else {
  Write-Host "`n⚠ Twilio not configured. Configure .env and restart server." -ForegroundColor Yellow
}
```

Run it:
```bash
pnpm exec node apps/server/src/index.ts  # Terminal 1: Start server
pwsh test-sms-endpoints.ps1               # Terminal 2: Run tests
```

### 3. Using Postman

1. **Create Collection:** "SMS Reminders"
2. **Add Environment Variables:**
   - `base_url`: `http://localhost:5710/api/v1`
   - `jwt_token`: (obtained from login)

3. **Add Requests:**

   **POST /auth/login**
   ```json
   {
     "email": "admin@example.com",
     "password": "admin123"
   }
   ```
   - Set `{{jwt_token}}` from response.accessToken

   **GET /reminders/twilio-status**
   - Header: `Authorization: Bearer {{jwt_token}}`

   **POST /reminders/send**
   - Header: `Authorization: Bearer {{jwt_token}}`
   - Body:
     ```json
     {
       "phoneNumber": "+12025551234",
       "message": "Test SMS from ScheduleRight"
     }
     ```

---

## UI Integration

### Reminders Page

The **Reminders** page at `/dashboard/reminders` now displays:

- **Twilio Status Card**
  - Connection status (green dot = connected, red dot = not configured)
  - Sender phone number (when configured)
  - Reminders enabled/disabled status
  - Live status fetched via `GET /api/v1/reminders/twilio-status`

- **Configuration Section**
  - Enable/disable reminders toggle
  - Lead time selector (1h to 48h before appointment)
  - Custom SMS template with placeholders:
    - `{{name}}` - Client name
    - `{{date}}` - Appointment date
    - `{{time}}` - Appointment time
    - `{{location}}` - Site location

---

## E.164 Phone Number Format

All phone numbers must be in [E.164 format](https://en.wikipedia.org/wiki/E.164):

✓ Valid:
- `+1234567890` (US)
- `+44201234567` (UK)
- `+33123456789` (France)
- `+919876543210` (India)

✗ Invalid:
- `1234567890` (missing country code)
- `(123) 456-7890` (formatting characters)
- `+1 234 567 8900` (spaces)

**Convert to E.164:**
```typescript
function toE164(phone: string, countryCode: string = 'US'): string {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '')
  
  // Add country code if missing
  if (!cleaned.startsWith(countryCode.length === 3 ? '1' : '44')) {
    return `+${cleaned}`
  }
  
  return `+${cleaned}`
}

// Examples
toE164('(555) 123-4567')  // → '+5551234567'
toE164('555-123-4567')    // → '+5551234567'
```

---

## Twilio Console

Monitor SMS activity in your [Twilio Console](https://www.twilio.com/console):

1. Go to **Messaging > Services**
2. Select your service
3. View **Message Logs**
4. Check status: `Queued`, `Sent`, `Delivered`, `Failed`

---

## Error Troubleshooting

| Error Code | Cause | Solution |
|-----------|-------|----------|
| **21211** | Invalid phone number | Verify E.164 format |
| **21614** | Account not authorized | Check Account SID and Auth Token |
| **21201** | Invalid request | Check required fields |
| **30005** | Twilio unavailable | Retry in a few moments |
| **503** | Not configured | Set env vars and restart server |

---

## Next Steps

- [ ] Integrate SMS sending into booking confirmation flow
- [ ] Add automatic reminder scheduler (bull/redis queue)
- [ ] Track message delivery status in database
- [ ] Add SMS template editor UI
- [ ] Implement SMS cost tracking and alerts
- [ ] Set up Twilio webhook for delivery notifications

---

## Security Notes

1. **Never commit secrets** - Use `.env.local` and `.gitignore`
2. **Rate limiting** - Implement per-user/org SMS rate limits
3. **Phone number validation** - Validate format before sending
4. **Cost control** - Set Twilio spend alerts
5. **Audit logging** - Log all SMS sends for compliance

---

## Support

- [Twilio Docs](https://www.twilio.com/docs)
- [Twilio SMS API](https://www.twilio.com/docs/sms)
- [E.164 Formatting](https://www.twilio.com/docs/glossary/what-e164)
- GitHub Issues: Report bugs or feature requests

