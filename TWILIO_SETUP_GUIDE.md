# Twilio SMS Setup Guide

**Last Updated:** January 16, 2026  
**Status:** Ready for configuration

---

## 🎯 Quick Start (5 minutes)

### Step 1: Create Twilio Account

1. Go to [https://www.twilio.com/try-twilio](https://www.twilio.com/try-twilio)
2. Sign up for a free trial account
3. You'll receive **$15 credit** (good for ~30-50 messages)
4. Verify your email address

### Step 2: Get Your Credentials

After signing up, you'll land on the Twilio Console. Copy these 3 values:

1. **Account SID** (starts with `AC...`)
2. **Auth Token** (click to reveal, then copy)
3. **Twilio Phone Number** (get a free trial number)

#### Getting a Twilio Phone Number:

1. In Twilio Console, click **"Get a Trial Number"**
2. Accept the auto-assigned number (or choose your own)
3. Copy the number in E.164 format: `+1234567890`

### Step 3: Configure Environment Variables

1. Open or create `.env.local` in your project root:

```bash
# Copy from .env.example
cp .env.example .env.local
```

2. Add your Twilio credentials:

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

### Step 4: Restart the Server

```bash
# Stop the server if it's running (Ctrl+C)
pnpm dev
```

The server will automatically detect the Twilio configuration and enable SMS features.

### Step 5: Test SMS Sending

#### Option A: Via API Endpoint

```bash
# PowerShell
$headers = @{
    "Authorization" = "Bearer YOUR_ACCESS_TOKEN"
    "Content-Type" = "application/json"
}

$body = @{
    phoneNumber = "+1234567890"  # Your phone number
    message = "Test message from ScheduleRight!"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5710/api/v1/reminders/send" `
    -Method POST -Headers $headers -Body $body
```

#### Option B: Via Admin Dashboard

1. Log in as admin: `admin@example.com` / `admin123`
2. Navigate to **Reminders** → **Settings**
3. Click **"Send Test SMS"**
4. Enter your phone number
5. Check your phone for the message

---

## 🔍 Verify Configuration

### Check Twilio Status

```bash
GET http://localhost:5710/api/v1/reminders/twilio-status
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Expected Response:**

```json
{
  "configured": true,
  "accountSid": "AC...",
  "phoneNumber": "+1234567890"
}
```

### Check Server Logs

When the server starts, you should see:

```
✅ Twilio SMS configured: +1234567890
🔔 Reminder scheduler started (runs every 15 minutes)
```

---

## ⚙️ Configure Reminder Settings

### Via Admin UI

1. Go to `/dashboard/reminders`
2. Configure reminder settings:
   - **Enable Reminders**: Toggle on
   - **Lead Time**: 24 hours (default)
   - **Message Template**: Customize the SMS message

### Message Template Variables

Use these placeholders in your template:

- `{{name}}` - Client name
- `{{date}}` - Appointment date (e.g., "Jan 16, 2026")
- `{{time}}` - Appointment time (e.g., "2:30 PM")

**Example Template:**

```
Hello {{name}}, your appointment is scheduled for {{date}} at {{time}}. See you soon!
```

---

## 🤖 Automatic Reminder System

Once configured, the system automatically:

1. **Scans every 15 minutes** for upcoming bookings
2. **Finds bookings** within the configured lead time (default: 24 hours)
3. **Sends SMS reminders** to clients with phone numbers
4. **Tracks sent reminders** to avoid duplicates
5. **Logs all attempts** for auditing

### Database Tracking

Each booking stores:

- `clientPhone`: Client's phone number
- `reminderSentAt`: Timestamp when reminder was sent
- Status updates in audit logs

---

## 📊 Monitoring & Troubleshooting

### Check Reminder History

```bash
GET /api/v1/bookings/:bookingId/messages
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### Common Issues

#### Issue: "Twilio not configured"

**Solution:** Check that all 3 env variables are set:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`

#### Issue: "Invalid phone number"

**Solution:** Phone numbers must be in E.164 format:
- ✅ Correct: `+12345678900`
- ❌ Wrong: `(234) 567-8900` or `234-567-8900`

#### Issue: Trial account restrictions

**Solution:** Twilio trial accounts can only send to verified numbers:
1. Add test numbers in Twilio Console → **Verified Caller IDs**
2. Or upgrade to a paid account (no monthly fee, pay-as-you-go)

#### Issue: Messages not sending

**Checklist:**
1. Verify credentials are correct
2. Check trial account balance
3. Ensure phone numbers are verified (trial accounts)
4. Check server logs for errors
5. Verify booking has `clientPhone` field

---

## 💰 Pricing (as of 2026)

### Trial Account
- **$15 credit** included
- ~30-50 SMS messages (depending on country)
- Can only send to verified numbers
- Phone number is free

### Paid Account
- **No monthly fee**
- Pay only for what you use
- ~$0.0075 per SMS (US/Canada)
- ~$1/month for phone number
- Send to any number

### Cost Examples

| Clients | Messages/Month | Estimated Cost |
|---------|----------------|----------------|
| 50      | 200            | ~$2.50         |
| 100     | 400            | ~$4.00         |
| 500     | 2,000          | ~$16.00        |

---

## 🔒 Security Best Practices

1. **Never commit credentials** to Git
   - Keep them in `.env.local` (already in `.gitignore`)

2. **Rotate tokens regularly**
   - Generate new auth tokens in Twilio Console
   - Update `.env.local` and restart server

3. **Limit access**
   - Only ADMIN and STAFF roles can send messages
   - Client data is protected by org-level permissions

4. **Monitor usage**
   - Set up Twilio usage alerts
   - Review sent messages regularly

---

## 🚀 Production Deployment

### Environment Variables

Make sure these are set in your production environment:

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_production_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

### Recommended Settings

1. **Enable Twilio usage alerts**
   - Set budget limits in Twilio Console
   - Get notified before hitting limits

2. **Configure webhooks**
   - Set delivery status callbacks
   - Track message delivery rates

3. **Scale reminder scheduler**
   - Adjust scan frequency based on volume
   - Default: 15 minutes (good for up to 10,000 bookings/day)

---

## 📞 Support

### Twilio Support
- Documentation: [https://www.twilio.com/docs](https://www.twilio.com/docs)
- Support: [https://support.twilio.com](https://support.twilio.com)

### ScheduleRight
- Check `/help` page in the dashboard
- Review server logs: `apps/server/src/services/reminder.service.ts`
- Test endpoints: `test-sms-endpoints.ps1`

---

## ✅ Verification Checklist

- [ ] Created Twilio account
- [ ] Obtained Account SID, Auth Token, and Phone Number
- [ ] Added credentials to `.env.local`
- [ ] Restarted server
- [ ] Verified Twilio status endpoint returns `configured: true`
- [ ] Sent test SMS successfully
- [ ] Configured reminder settings in admin UI
- [ ] Verified automatic reminder scheduler is running
- [ ] Added test booking with phone number
- [ ] Confirmed reminder was sent automatically

---

**Next Steps:**

1. Set up Twilio credentials (this guide)
2. Configure reminder settings in `/dashboard/reminders`
3. Test with a booking that has a phone number
4. Monitor message history in `/dashboard/bookings/:bookingId`
