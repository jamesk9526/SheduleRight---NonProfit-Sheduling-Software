# Implementation Plan: Bookings, Availability, Embed & Multi-Site

## Current State Analysis

### ✅ What's Already Built
- **Backend Routes**: `booking.ts`, `availability.ts`, `volunteers.ts`, `reminders.ts` 
- **Services**: Complete booking, availability, reminder services
- **Database**: Schema supports bookings, availability slots, volunteers
- **Authentication**: RBAC middleware ready (ADMIN, STAFF roles)
- **Twilio Config**: Environment variables configured in config.ts
- **API Endpoints**: Partially implemented

### ❌ What Needs Work

#### 1. **Bookings & Availability Pages** 
- **Status**: Pages exist but lacking functionality
- **Issue**: Missing hooks to fetch/mutate data
- **Required**:
  - `useCreateBooking` hook (POST booking)
  - `useMyBookings` hook (GET user's bookings)
  - `useBookingDetails` hook
  - Booking confirmation/cancellation mutations
  - Time slot selection UI

#### 2. **Availability Scheduling**
- **Status**: API exists but frontend not connected
- **Issue**: No UI to create/manage availability slots
- **Required**:
  - `useAvailabilitySlots` hook
  - `useCreateAvailability` hook
  - Calendar widget for date/time selection
  - Capacity management UI

#### 3. **Multi-Site Support**
- **Status**: Database supports multi-site but UI doesn't
- **Issue**: No site selector/switcher, no site context in pages
- **Required**:
  - Site selector dropdown in dashboard
  - Site context provider for entire app
  - Update all queries to filter by site
  - Site selection persistence in localStorage

#### 4. **Embedded Widget**
- **Status**: `/apps/embed` exists but not implemented
- **Issue**: No initialization logic, no booking form
- **Required**:
  - Embed initialization script
  - Cross-origin setup (CORS)
  - Standalone booking widget
  - Styling & customization

#### 5. **Twilio Integration**
- **Status**: Config ready, send endpoint exists
- **Issue**: No reminder scheduling, no message history
- **Required**:
  - Configure Twilio credentials
  - Implement reminder scheduling (cron)
  - Add message history tracking
  - Client message endpoints
  - SMS status callbacks

---

## Implementation Sequence

### Phase 1: Core Features (High Priority)
1. **Multi-Site Support** (foundation for everything else)
   - Site context provider
   - Update data fetching
   - Site selector UI

2. **Bookings Workflow** (revenue-critical)
   - API verification
   - Frontend hooks
   - Booking form & confirmation

3. **Availability Management** (data foundation)
   - Availability creation UI
   - Calendar integration
   - Slot management

### Phase 2: Messaging & Automation
4. **Twilio Setup** (automation)
   - Environment configuration
   - Test sending
   - Reminder scheduling

5. **Client Messaging** (engagement)
   - Message endpoints
   - Message history
   - Notification UI

### Phase 3: Advanced Features
6. **Embedded Widget** (distribution)
   - Widget initialization
   - Public booking form
   - Client-facing interface

---

## Detailed Tasks

### 1️⃣ Multi-Site Support
**Files to Create/Modify**:
- `apps/web/lib/hooks/useSite.ts` (new) - Site context and switching
- `apps/web/app/providers.tsx` - Add SiteProvider
- `apps/web/lib/hooks/useData.ts` - Update queries to include siteId
- `apps/web/app/(dashboard)/dashboard/page.tsx` - Add site selector

**Endpoints Needed**:
- ✅ GET /api/v1/orgs/:orgId/sites (exists)
- ✅ POST /api/v1/orgs/:orgId/sites (exists, fixed)

---

### 2️⃣ Bookings Implementation
**Files to Create/Modify**:
- `apps/web/lib/hooks/useData.ts` - Add booking hooks
  - `useMyBookings()`
  - `useCreateBooking()`
  - `useBookingDetails()`
  - `useConfirmBooking()`, `useCancelBooking()`, etc.
- `apps/web/app/(dashboard)/bookings/page.tsx` - Implement UI

**Endpoints Check**:
- POST /api/v1/sites/:siteId/bookings
- GET /api/v1/bookings/me
- GET /api/v1/bookings/:bookingId
- PUT /api/v1/bookings/:bookingId/confirm
- PUT /api/v1/bookings/:bookingId/cancel

---

### 3️⃣ Availability Implementation
**Files to Create/Modify**:
- `apps/web/lib/hooks/useData.ts` - Add availability hooks
  - `useAvailabilitySlots(siteId, date?)`
  - `useCreateAvailability(siteId)`
  - `useDeleteAvailability()`
- `apps/web/app/(dashboard)/availability/page.tsx` (new)
- Calendar component (use react-calendar or date-fns)

**Endpoints Check**:
- POST /api/v1/sites/:siteId/availability
- GET /api/v1/sites/:siteId/availability
- GET /api/v1/sites/:siteId/availability/available?date=YYYY-MM-DD
- DELETE /api/v1/sites/:siteId/availability/:slotId

---

### 4️⃣ Twilio Configuration & Reminders
**Files to Modify**:
- `.env.local` - Add Twilio credentials
- `apps/server/src/services/reminder.service.ts` - Add scheduling
- `apps/web/app/(dashboard)/reminders/page.tsx` - Already partially done

**Setup Steps**:
1. Get Twilio Account SID, Auth Token, Phone Number
2. Create .env entry:
   ```
   TWILIO_ACCOUNT_SID=ACxxxxx
   TWILIO_AUTH_TOKEN=your_token
   TWILIO_PHONE_NUMBER=+1234567890
   ```
3. Test SMS sending
4. Implement reminder scheduler (cron job)

---

### 5️⃣ Client Messaging
**Files to Create/Modify**:
- `apps/server/src/routes/messaging.ts` (new)
- `apps/server/src/services/messaging.service.ts` (new)
- `apps/web/lib/hooks/useData.ts` - Add messaging hooks
- `apps/web/app/(dashboard)/bookings/[id]/messages/page.tsx` (new)

**New Endpoints**:
- POST /api/v1/bookings/:bookingId/messages (send SMS)
- GET /api/v1/bookings/:bookingId/messages (history)
- POST /api/v1/webhooks/twilio/status (callback for status updates)

---

### 6️⃣ Embedded Widget
**Files to Create/Modify**:
- `apps/embed/app/page.tsx` - Standalone booking interface
- `apps/embed/lib/hooks/usePublicBooking.ts` - Public API client
- Embed initialization script
- CORS configuration

---

## Environment Variables Needed

```bash
# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_VERIFY_SID=VExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  # Optional for 2FA

# App URLs
NEXT_PUBLIC_EMBED_URL=http://localhost:5712
NEXT_PUBLIC_API_URL=http://localhost:5710
```

---

## Success Criteria

✅ Users can:
- Select/switch between multiple sites
- Create availability slots for their sites
- View available slots and make bookings
- Receive SMS reminders before bookings
- Message clients via SMS
- Use embedded booking widget on external websites

✅ Admin can:
- Manage multiple sites
- View all bookings and confirmations
- Send SMS to clients
- Configure Twilio settings

---

## Risk Areas & Dependencies

1. **Twilio**: Requires paid account (free trial available)
2. **Time Zone Handling**: Availability times need TZ conversion
3. **Overbooking**: Need capacity management logic
4. **CORS**: Embed widget needs proper cross-origin setup
5. **SMS Cost**: Each message costs money - need quota management

---

## Estimated Effort

| Task | Effort | Priority |
|------|--------|----------|
| Multi-Site Support | 4-6 hours | 🔴 Critical |
| Bookings | 6-8 hours | 🔴 Critical |
| Availability | 5-7 hours | 🔴 Critical |
| Twilio Setup | 2-3 hours | 🟠 High |
| Messaging | 4-6 hours | 🟠 High |
| Embedded Widget | 6-8 hours | 🟡 Medium |

**Total**: 27-38 hours of development

---

**Date**: January 16, 2026
**Status**: Analysis Complete - Ready to implement
