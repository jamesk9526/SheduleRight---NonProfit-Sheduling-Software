# REMAINING WORK: Bookings & Messaging Phase

**Current Status**: Multi-site foundation & availability page complete  
**Phase**: 2 of 3 (Messaging & Twilio configuration)  
**Estimated Remaining**: 20-30 hours  

---

## 🎯 IMMEDIATE NEXT STEPS (Start Here)

### 1️⃣ TWILIO SETUP & SMS CONFIGURATION (2-3 hours)
**Priority**: 🔴 CRITICAL

**What to do**:
```bash
Step 1: Get Twilio Credentials
- Go to https://www.twilio.com
- Create free account (get $15 credit, good for ~30 messages)
- Copy: Account SID, Auth Token, Phone Number

Step 2: Add Environment Variables
- Create or edit .env.local in project root
- Add these 3 lines:
  TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  TWILIO_PHONE_NUMBER=+1234567890

Step 3: Restart Server
- Server will automatically pick up new env vars
- Test SMS sending endpoint

Step 4: Test with PowerShell
- Run script in test-auth-endpoints.ps1
- Send test SMS to your phone
- Verify delivery
```

**Code that already exists**:
- ✅ Config.ts has Twilio settings
- ✅ reminders.ts has send endpoint
- ✅ Reminder settings page ready
- ✅ Test endpoint exists

**Verification**:
```bash
GET  /api/v1/reminders/twilio-status     # Should show "configured"
POST /api/v1/reminders/send              # Should send SMS
```

---

### 2️⃣ REMINDER SCHEDULER IMPLEMENTATION (3-4 hours)
**Priority**: 🔴 HIGH

**What to do**:
1. Implement cron job in `reminder.service.ts`:
```typescript
// Pseudo-code
async function scheduleReminders() {
  // Every hour, find bookings happening 24 hours from now
  // Check if reminder already sent
  // Send SMS via Twilio
  // Mark as sent in database
}
```

2. Add to server startup:
```typescript
// In apps/server/src/index.ts
startReminderScheduler()
```

3. Update database schema to track sent reminders:
```sql
ALTER TABLE bookings ADD COLUMN reminderSentAt TIMESTAMP NULL;
```

**Files to modify**:
- `apps/server/src/services/reminder.service.ts`
- `apps/server/src/index.ts`
- Database migration file

---

### 3️⃣ CLIENT MESSAGING IMPLEMENTATION (4-6 hours)
**Priority**: 🟠 HIGH

**New Endpoints Needed**:
```
POST   /api/v1/bookings/:bookingId/messages    # Send SMS to client
GET    /api/v1/bookings/:bookingId/messages    # Get message history
POST   /api/v1/webhooks/twilio/status          # Twilio callback (delivery status)
```

**Files to create**:
```
apps/server/src/routes/messaging.ts           # NEW
apps/server/src/services/messaging.service.ts # NEW
```

**Hooks to add to useData.ts**:
```typescript
useClientMessages(bookingId)  // Get message history
useSendClientMessage(bookingId) // Send SMS
```

**Database**:
- Create messages table with fields:
  - bookingId, senderId, message, phoneNumber
  - status (pending, sent, delivered, failed)
  - sentAt, deliveredAt
  - twilioMessageId (for tracking)

---

### 4️⃣ BOOKING FORM & WORKFLOW (4-6 hours)
**Priority**: 🟠 HIGH

**What to do**:

1. Create booking form at:
   - `/dashboard/bookings/[siteId]/new`
   - Public form at `/public/book/[siteId]`

2. Wire hooks:
```typescript
const { mutate: createBooking } = useCreateBooking(siteId)
const { data: slots } = useAvailableSlots(siteId, selectedDate)
```

3. Build UI components:
   - Date picker
   - Time slot selector
   - Client info form
   - Confirmation page

4. Implement confirmation workflow:
   - Show success message
   - Send confirmation email/SMS
   - Display booking reference

---

### 5️⃣ EMBEDDED WIDGET IMPLEMENTATION (6-8 hours)
**Priority**: 🟡 MEDIUM

**What to do**:

1. Create public API endpoints:
```
GET  /api/public/sites/:siteId/info
GET  /api/public/sites/:siteId/availability
POST /api/public/bookings                    # No auth required
```

2. Build embed app (`apps/embed`):
   - Standalone booking component
   - Fetch availability
   - Submit bookings
   - Styling that works anywhere

3. Create embed script:
```html
<script src="https://yoursite.com/embed.js"></script>
<div id="scheduleright-booking" data-site-id="..."></div>
```

4. CORS configuration:
```typescript
// Allow embedding from any domain
corsOrigin: ['*']  // Or specific domains
```

---

## 📋 DETAILED TASK BREAKDOWN

### Task Group A: SMS Infrastructure (6-7 hours total)
```
A1: ✅ Twilio credentials setup                    [2-3 hrs] READY
A2: ⏳ Implement reminder scheduler                [2 hrs]   BLOCKED ON A1
A3: ⏳ Add reminder tracking to database           [1 hr]    BLOCKED ON A1
A4: ⏳ Create cron job management UI              [1 hr]    BLOCKED ON A1
```

### Task Group B: Client Messaging (5-7 hours total)
```
B1: ⏳ Create messaging service                    [1.5 hrs] BLOCKED ON A1
B2: ⏳ Add messaging routes & endpoints            [1.5 hrs] BLOCKED ON B1
B3: ⏳ Create React hooks for messaging            [1 hr]    BLOCKED ON B2
B4: ⏳ Build message history UI                    [1.5 hrs] BLOCKED ON B3
B5: ⏳ Add message composer to booking details     [1 hr]    BLOCKED ON B4
```

### Task Group C: Booking Workflow (8-10 hours total)
```
C1: ⏳ Build booking form component                [2-3 hrs] READY
C2: ⏳ Create booking confirmation page            [1-2 hrs] READY
C3: ⏳ Add booking details view                    [1-2 hrs] READY
C4: ⏳ Implement cancellation flow                 [1 hr]    READY
C5: ⏳ Wire up emails/SMS confirmation             [2 hrs]   BLOCKED ON A1
C6: ⏳ Add payment integration (optional)          [2 hrs]   OPTIONAL
```

### Task Group D: Embedded Widget (8-10 hours total)
```
D1: ⏳ Create public API endpoints                 [2 hrs]   READY
D2: ⏳ Build standalone booking component          [3 hrs]   READY
D3: ⏳ Create embed initialization script          [2 hrs]   READY
D4: ⏳ Configure CORS properly                     [1 hr]    READY
D5: ⏳ Write embed documentation                   [1-2 hrs] READY
D6: ⏳ Test on multiple external domains           [1 hr]    READY
```

---

## 📊 DEPENDENCY TREE

```
Twilio Setup (A1) ← BLOCKER
    ├─ Reminder Scheduler (A2)
    ├─ Message Service (B1)
    │   ├─ Message Routes (B2)
    │   ├─ Message Hooks (B3)
    │   ├─ Message UI (B4)
    │   └─ Booking Details Messages (B5)
    └─ Booking Confirmations (C5)

Booking Form (C1) ← Can start now
    ├─ Confirmation Page (C2)
    ├─ Booking Details (C3)
    └─ Cancellation (C4)

Embed Widget (D1-D6) ← Can start now
```

**Legend**: 
- 🔴 Tasks marked RED = blocked by setup
- 🟠 Tasks marked ORANGE = medium priority
- 🟡 Tasks marked YELLOW = can start anytime
- ✅ Tasks marked GREEN = completed

---

## 🚀 RECOMMENDED WORK ORDER

### Week 1: Foundation (Get Twilio + Basic Messaging)
```
Day 1: Get Twilio credentials
Day 2: Implement reminder scheduler
Day 3: Create messaging service
Day 4: Wire up message UI
Day 5: Testing & validation
```

### Week 2: Booking Experience
```
Day 6: Build booking form
Day 7: Create confirmation flow
Day 8: Booking details & history
Day 9: Cancellation & refunds
Day 10: E2E testing
```

### Week 3: Distribution (Embed Widget)
```
Day 11: Public API endpoints
Day 12: Embed component
Day 13: Embed script & CORS
Day 14: Documentation
Day 15: QA & launch preparation
```

---

## 🔑 KEY FILES TO MODIFY/CREATE

### Backend
```
CREATE: apps/server/src/routes/messaging.ts
CREATE: apps/server/src/services/messaging.service.ts
MODIFY: apps/server/src/services/reminder.service.ts
MODIFY: apps/server/src/index.ts (add scheduler)
MODIFY: database migrations (add messages table)
MODIFY: apps/server/src/routes/booking.ts (add confirmations)
```

### Frontend
```
CREATE: apps/web/app/(dashboard)/bookings/[siteId]/new/page.tsx
CREATE: apps/web/app/(dashboard)/bookings/[bookingId]/page.tsx
CREATE: apps/web/app/(dashboard)/bookings/[bookingId]/messages/page.tsx
CREATE: apps/web/lib/hooks/useMessaging.ts (extend useData.ts)
MODIFY: apps/web/lib/hooks/useData.ts (add messaging hooks)
MODIFY: apps/embed/app/page.tsx (public booking form)
```

### Configuration
```
MODIFY: .env.local (add Twilio vars)
MODIFY: apps/server/src/config.ts (already done)
CREATE: TWILIO_SMS_SETUP.md (documentation)
```

---

## ✅ VALIDATION CHECKLIST

Before moving to next phase:

- [ ] Twilio account created & credentials obtained
- [ ] SMS sending tested successfully
- [ ] Reminder scheduler running on server
- [ ] Messages appear in database
- [ ] Message hooks working in React components
- [ ] Booking form creates records
- [ ] Confirmation SMS/email sent
- [ ] Embedded widget loads on external site
- [ ] All CORS headers correct
- [ ] Production URLs configured

---

## 💡 TIPS FOR SUCCESS

1. **Start with Twilio first** - It's the blocker for many features
2. **Test SMS sending early** - Use your phone, verify it works
3. **Use React Query devtools** - See cache updates in real-time
4. **Create mock data** - Test without calling APIs
5. **Stage features** - Build UI first, connect APIs after
6. **Keep it simple** - Booking form doesn't need to be fancy
7. **Document as you go** - Future you will thank you

---

## 🎯 SUCCESS CRITERIA

✅ **All of the following must be true**:
- [ ] Users can see available time slots
- [ ] Users can book appointments
- [ ] Staff receive SMS reminders 24 hours before
- [ ] Staff can send SMS messages to clients
- [ ] Message history visible in booking details
- [ ] Widget embeds on external websites
- [ ] No database errors in logs
- [ ] All forms validate properly
- [ ] Mobile UI is responsive
- [ ] Performance is acceptable (<1s page loads)

---

## 📞 GETTING HELP

**Twilio Questions**: https://www.twilio.com/docs/sms  
**React Query**: https://tanstack.com/query/latest  
**Next.js**: https://nextjs.org/docs  
**Database**: Check migrations in `apps/server/src/db/migrations`

---

**Ready to start?** Grab Twilio credentials and let's go! 🚀

