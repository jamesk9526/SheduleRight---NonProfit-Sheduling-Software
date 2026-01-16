# Dashboard Features Guide

This guide documents all the dashboard pages and features now available in ScheduleRight.

## Pages Overview

### 1. Dashboard (`/dashboard`)

**Main landing page after login**

Features:
- Welcome message with user name
- Quick navigation to Profile, Organizations, and My Organization
- User roles display
- Logout button with proper session cleanup

**Access:** All authenticated users

---

### 2. Profile (`/profile`)

**User account information and settings**

Features:
- User profile information (email, name, roles)
- Organization ID display
- Account status (active/inactive)
- Verification status
- Sign out button

Information shown:
- Email address (read-only)
- Full name (read-only)
- Assigned roles (badges)
- Organization membership
- Account status indicator
- Verification status indicator

**Access:** All authenticated users
**Permissions:** Users can only view their own profile

---

### 3. Organizations (`/orgs`)

**List and manage all organizations (Admin only)**

Features:
- List all organizations in the system
- Create new organization button
- Organization cards with:
  - Organization name
  - Organization ID
  - Timezone
  - Created and updated dates
  - View details link

Actions:
- Click card or "View Details" to go to organization detail page
- Click "+ New Organization" to create new organization

**Access:** ADMIN role only
**Permissions:** 
- Only admins can view all orgs
- Users without admin role see access denied message

---

### 4. Create Organization (`/orgs/new`)

**Create new nonprofit organization**

Form Fields:
- **Organization Name** (required)
  - Official name of the nonprofit
  - Example: "Community Center", "Food Bank"
  
- **Default Timezone** (required)
  - Eastern Time (ET)
  - Central Time (CT)
  - Mountain Time (MT)
  - Pacific Time (PT)
  - UTC
  - Used for scheduling and reporting

Features:
- Form validation
- "What's Next?" info box with next steps
- Cancel and Create buttons
- Disabled submit until name is entered

**Access:** ADMIN role only

---

### 5. Organization Detail (`/orgs/:orgId`)

**View organization details and manage its sites**

Left Column - Organization Info:
- Organization name
- Timezone
- Tenant ID
- Created timestamp
- Last updated timestamp

Right Column - Sites Management:
- List of all sites for the organization
- Create new site button (admin only)
- Site cards showing:
  - Site name
  - Site ID
  - Address (if available)
  - Phone (if available)
  - Created date

**New Site Form (Admin only):**
- Site Name (required)
- Address (optional)
- Phone (optional)
- Create Site button

Features:
- Sites automatically display when created
- Form validation on site creation
- Empty state if no sites exist
- Error handling for network failures

**Access:** Users who are members of the organization
**Permissions:**
- All members can view organization and sites
- Only admins can create new sites

---

## API Endpoints Used

### User Endpoints
- `GET /api/v1/users/me` - Get current user info

### Organization Endpoints
- `GET /api/v1/orgs` - List all organizations (admin)
- `GET /api/v1/orgs/:orgId` - Get org details
- `POST /api/v1/orgs` - Create new organization

### Site Endpoints
- `GET /api/v1/orgs/:orgId/sites` - List sites in organization
- `POST /api/v1/orgs/:orgId/sites` - Create new site

### Auth Endpoints
- `POST /api/v1/auth/logout` - Sign out user

---

## Hooks Used

### Custom Hooks (in `lib/hooks/`)

#### `useApi()`
- Makes authenticated API calls
- Auto-includes JWT token from localStorage
- Returns `call()` function and `API_BASE_URL`

```typescript
const { call, API_BASE_URL } = useApi()
const response = await call('/api/v1/endpoint', {
  method: 'POST',
  body: { data }
})
```

#### `useData()` - React Query Hooks

**Query Hooks (Read-only):**
- `useCurrentUser()` - Fetch current user
- `useOrganizations()` - Fetch all orgs (admin)
- `useOrganization(orgId)` - Fetch single org
- `useSites(orgId)` - Fetch sites in org

**Mutation Hooks (Write):**
- `useCreateOrganization()` - Create new org
- `useCreateSite(orgId)` - Create new site in org

```typescript
const { data, isLoading, error } = useCurrentUser()
const { mutate, isPending } = useCreateOrganization()

mutate({ name: 'New Org' }, {
  onSuccess: () => router.push('/orgs')
})
```

---

## Features by User Role

### ADMIN
- ✅ View all organizations
- ✅ Create new organizations
- ✅ View all sites in any organization
- ✅ Create new sites in any organization
- ✅ View own profile
- ✅ Logout

### STAFF
- ✅ View own organization
- ✅ View sites in own organization
- ❌ Cannot create organizations
- ❌ Cannot create sites
- ✅ View own profile
- ✅ Logout

### VOLUNTEER
- ✅ View own organization
- ✅ View sites in own organization
- ❌ Cannot create organizations
- ❌ Cannot create sites
- ✅ View own profile
- ✅ Logout

### CLIENT
- ✅ View own organization
- ✅ View sites in own organization
- ❌ Cannot create organizations
- ❌ Cannot create sites
- ✅ View own profile
- ✅ Logout

---

## Navigation Flow

```
Login (/login)
    ↓
Dashboard (/dashboard)
    ├── Profile (/profile)
    ├── Organizations (/orgs) [ADMIN ONLY]
    │   └── Create Organization (/orgs/new)
    │   └── Organization Detail (/orgs/:orgId)
    │       └── Create Site
    └── My Organization (/orgs/:orgId)
        └── Create Site
```

---

## Error Handling

All pages include:
- **Loading states** - Skeleton screens while data loads
- **Error states** - User-friendly error messages
- **Empty states** - Helpful messages when no data exists
- **Fallback redirects** - Unauthenticated users redirected to login

### Common Errors:
- **401 Unauthorized** - Token expired or invalid → Redirect to login
- **403 Forbidden** - User lacks permission → Show access denied message
- **404 Not Found** - Organization/site doesn't exist → Show error and back button
- **500 Server Error** - Backend issue → Show error message with retry option

---

## Testing the Dashboard

### 1. Test as Admin User
```bash
Email: admin@example.com
Password: admin123
```

Should see:
- Dashboard with Profile + Organizations + My Organization links
- Full Organizations list page
- Ability to create new organizations
- Ability to create new sites

### 2. Test as Staff User
```bash
Email: staff@example.com
Password: staff123
```

Should see:
- Dashboard with Profile + My Organization link (no Organizations link)
- Error if trying to access /orgs
- Can view own organization and its sites
- Cannot create organizations or sites

### 3. Test Org and Site Management
1. Log in as admin
2. Go to Organizations
3. Click "+ New Organization"
4. Create "Test Org"
5. Click on created org
6. Click "+ New Site"
7. Create "Test Site"
8. Verify site appears in list

### 4. Test Profile
1. Click Profile link from dashboard
2. Verify all user info is correct
3. Click Sign Out
4. Verify redirected to login page
5. Verify localStorage is cleared

---

## Data Flow

```
User Login
    ↓
AccessToken stored in localStorage
    ↓
Navigate to Dashboard
    ↓
useCurrentUser() fetches /api/v1/users/me
    ↓
Check user.roles to show/hide admin features
    ↓
User can navigate to profile, orgs, or organization detail
    ↓
Each page uses React Query to fetch data
    ↓
Mutations (create, update, delete) invalidate queries
    ↓
UI updates automatically
```

---

## Component Hierarchy

```
Layout (layout.tsx)
└── Dashboard (dashboard/page.tsx)
    ├── Navigation Cards
    │   ├── Profile Link
    │   ├── Organizations Link [ADMIN]
    │   └── My Organization Link
    └── User Info

Profile (profile/page.tsx)
└── User Card
    ├── Avatar
    ├── User Info
    ├── Roles
    └── Sign Out Button

Organizations (orgs/page.tsx)
└── Org List
    ├── Create Button
    └── Org Cards

Organization Detail (orgs/[orgId]/page.tsx)
├── Org Info Card
└── Sites List
    ├── Create Form
    └── Site Cards

Create Organization (orgs/new/page.tsx)
└── Form
    ├── Name Input
    ├── Timezone Select
    └── Submit Button
```

---

## Next Steps

After dashboard features:

1. **Availability & Booking** (Todo #7)
   - Schedule availability slots
   - Allow clients to book appointments
   - Manage conflicts and capacity

2. **Integration Tests** (Todo #8)
   - Test full user flows
   - Test RBAC enforcement
   - Test multi-tenant isolation

3. **Multi-tenant Config** (Todo #10)
   - Setup custom domains per organization
   - Configure subdomain routing
   - Test organization isolation

---

## Troubleshooting

### Pages not loading
- Check that `pnpm dev` is running
- Check that API server is running on port 3001
- Check that CouchDB is running

### "Failed to fetch" errors
- Verify API token is in localStorage
- Check browser console for detailed error
- Visit http://localhost:3001/status to check API health

### Can't create organization
- Verify you're logged in as ADMIN
- Check browser console for API error
- Try refreshing page and trying again

### Sites not showing
- Make sure organization exists
- Try refreshing page
- Check API /orgs/:orgId/sites endpoint

### Logout not working
- Clear localStorage manually: DevTools → Application → Storage → Local Storage
- Clear cookies: DevTools → Application → Cookies
- Try again

---

## Styling

All pages use Tailwind CSS with custom primary color:
- Primary color: Defined in `tailwind.config.ts` as `primary-600`
- Neutral colors: Grayscale for backgrounds and text
- Components: Rounded corners, shadows, hover effects

### Tailwind Classes Used:
- `container` - Max width wrapper
- `bg-*` - Background colors
- `text-*` - Text colors and sizes
- `rounded-lg` - Border radius
- `shadow-md` - Drop shadows
- `hover:*` - Hover states
- `transition` - Smooth animations
- `disabled:*` - Disabled states

---

## Accessibility

Pages include:
- ✅ Semantic HTML (`<button>`, `<form>`, `<label>`)
- ✅ Form labels properly associated with inputs
- ✅ Alt text and emojis for visual content
- ✅ Color contrast meets WCAG standards
- ✅ Keyboard navigation support
- ✅ Focus indicators on interactive elements

---

## Performance

Optimizations:
- React Query caching to prevent unnecessary API calls
- Lazy loading components with `next/dynamic`
- Image optimization with `next/image`
- Code splitting per route
- CSS-in-JS with Tailwind (no extra stylesheets)

---

## Security

Security measures:
- ✅ JWT tokens stored in localStorage (with httpOnly cookies in production)
- ✅ All API calls include Authorization header
- ✅ RBAC enforcement on backend
- ✅ Tenancy isolation (users only see their org data)
- ✅ Logout clears all authentication data
- ✅ Protected routes redirect unauthenticated users to login

---

## Browser Support

Tested on:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Requires JavaScript enabled.

---

## Future Improvements

Planned features:
- [ ] Profile picture upload
- [ ] Edit organization details
- [ ] Delete organizations
- [ ] Edit/delete sites
- [ ] Bulk user import
- [ ] Organization settings page
- [ ] User management per organization
- [ ] Activity logs and audit trail
- [ ] Dark mode support
