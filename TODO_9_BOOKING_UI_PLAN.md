# Todo #9: Web UI for Bookings - Implementation Plan

## 🎯 Objective
Build a complete frontend for the booking system with pages for browsing availability, creating bookings, and managing appointments.

## 📋 Pages to Create

### 1. Browse Availability Page
**Route**: `/dashboard/bookings/browse`
**Purpose**: Clients/users can search and view available time slots
**Components needed:**
- Calendar/date picker
- Service/staff selection filter
- Time slot grid display
- Booking quick-view modal

### 2. Create Booking Page  
**Route**: `/dashboard/bookings/new`
**Purpose**: Complete booking form with validation
**Components needed:**
- Date/time selector
- Service selection
- Staff assignment (optional/required)
- Client info form
- Confirmation dialog

### 3. My Bookings Page
**Route**: `/dashboard/bookings/my`
**Purpose**: View user's own bookings
**Components needed:**
- Bookings list/table
- Status badges
- Filtering (upcoming, completed, cancelled)
- Cancel/reschedule actions

### 4. Admin Booking Management
**Route**: `/dashboard/bookings/manage` (staff/admin only)
**Purpose**: Staff can see all bookings and manage them
**Components needed:**
- Full bookings table
- Search/filter bar
- Client info column
- Confirm/complete/no-show actions
- Staff notes field

### 5. Booking Details Page
**Route**: `/dashboard/bookings/:bookingId`
**Purpose**: View full booking details
**Components needed:**
- Booking info display
- Client details
- Staff notes
- Action buttons (confirm, complete, cancel)
- Status history/timeline

## 🛠️ Technical Stack

### Libraries to use:
- **React Hook Form** - Form handling and validation
- **date-fns** - Date formatting and manipulation
- **TanStack Query (React Query)** - Data fetching and caching
- **Tailwind CSS** - Styling
- **Zod** - Client-side validation

### Hooks to leverage:
- `useApi()` - API calls with auth
- `useData()` - Shared data fetching
- `useRouter()` - Navigation
- `useQuery` - React Query for data

## 📱 Features

### For Clients
✅ Browse available appointment slots
✅ Filter by date, time, service, staff
✅ Create new booking with client info
✅ View own bookings
✅ Cancel booking with reason
✅ See booking status

### For Staff/Admin
✅ View all bookings
✅ Search/filter bookings
✅ Confirm pending bookings
✅ Mark completed
✅ Mark no-show
✅ Add/view staff notes
✅ See client details

### UI/UX
✅ Responsive design (mobile, tablet, desktop)
✅ Loading states
✅ Error messages
✅ Success notifications
✅ Confirmation dialogs
✅ Date/time pickers
✅ Filters and search
✅ Status badges/colors

## 📐 Component Structure

```
apps/web/app/(dashboard)/
├── bookings/
│   ├── page.tsx                    (Main bookings nav/redirect)
│   ├── browse/
│   │   ├── page.tsx               (Browse availability)
│   │   └── components/
│   │       ├── AvailabilityGrid.tsx
│   │       ├── DatePicker.tsx
│   │       └── FilterBar.tsx
│   ├── new/
│   │   ├── page.tsx               (Create booking)
│   │   └── components/
│   │       ├── BookingForm.tsx
│   │       ├── ClientInfoForm.tsx
│   │       └── ConfirmDialog.tsx
│   ├── my/
│   │   ├── page.tsx               (My bookings)
│   │   └── components/
│   │       ├── BookingsList.tsx
│   │       ├── StatusFilter.tsx
│   │       └── BookingCard.tsx
│   ├── manage/
│   │   ├── page.tsx               (Staff: manage all bookings)
│   │   └── components/
│   │       ├── BookingsTable.tsx
│   │       ├── SearchBar.tsx
│   │       └── ActionButtons.tsx
│   └── [bookingId]/
│       ├── page.tsx               (Booking details)
│       └── components/
│           ├── BookingDetails.tsx
│           └── ClientCard.tsx

libs/ui/
└── components/
    ├── DateTimePicker.tsx
    ├── StatusBadge.tsx
    ├── ConfirmDialog.tsx
    └── FilterSelect.tsx
```

## 🔄 Data Flow

1. User navigates to bookings section
2. useData hook fetches availability/bookings from API
3. Display list/grid based on page
4. User interacts (select date, fill form, click action)
5. useApi hook calls booking endpoint
6. React Query updates cache
7. UI updates with success/error

## ✅ Success Criteria

1. ✅ All 5 pages render without errors
2. ✅ Can browse and filter availability
3. ✅ Can create booking with validation
4. ✅ Can view own bookings
5. ✅ Can manage bookings (staff only)
6. ✅ Can perform actions (confirm, cancel, complete)
7. ✅ Mobile responsive
8. ✅ Error handling and loading states
9. ✅ TypeScript strict mode
10. ✅ Form validation with Zod

## 🚀 Implementation Order

1. **Create layout and navigation** → Main bookings page with nav
2. **Build Browse page** → Availability search/filter
3. **Build Create Booking page** → Booking form
4. **Build My Bookings page** → User's bookings list
5. **Build Manage page** → Staff/admin bookings table
6. **Build Details page** → Individual booking view
7. **Add UI polish** → Colors, icons, status badges
8. **Test responsiveness** → Mobile, tablet, desktop
9. **Error handling** → Loading states, error messages
10. **Final polish** → Confirm dialogs, notifications

## 📊 Estimated Effort

- Browse page: 1.5 hours
- Create Booking page: 2 hours
- My Bookings page: 1 hour
- Manage page: 1.5 hours
- Details page: 1 hour
- UI components: 1 hour
- Styling/polish: 1 hour
- Testing: 1 hour
- **Total: ~10 hours**

---

**Ready to start? Let's begin with the Browse Availability page!**
