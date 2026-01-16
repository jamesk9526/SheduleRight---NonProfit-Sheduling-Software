# Dashboard Quick Start

## Available Pages

### 👤 Profile (`/dashboard/profile`)
Your account information and settings
- View email, name, roles
- Check account status
- Sign out

### 🏢 Organizations (`/dashboard/orgs`) - ADMIN ONLY
Manage all organizations in the system
- View all nonprofits
- Create new organization
- View organization details and sites

### 🏪 My Organization (`/dashboard/orgs/:orgId`)
View your organization and manage sites
- View organization details
- List all sites
- Create new site (if admin)

## Testing the Dashboard

### Prerequisite Setup
```bash
# Terminal 1: Start database
docker-compose up -d

# Terminal 2: Start dev servers  
pnpm dev

# Terminal 3: Seed database
pnpm --filter=@scheduleright/server seed
```

### Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@example.com | admin123 |
| Staff | staff@example.com | staff123 |
| Volunteer | volunteer@example.com | volunteer123 |
| Client | client@example.com | client123 |

### Test Scenarios

#### Scenario 1: Admin User Flow
1. Open http://localhost:3000
2. Login with admin@example.com / admin123
3. Should see Dashboard with all navigation links
4. Click "Organizations" to see all orgs
5. Click "+ New Organization" to create one
6. Fill form and click "Create Organization"
7. Click on created org to see detail view
8. Click "+ New Site" to add site to org
9. Fill form and click "Create Site"

**Expected:** All pages load, orgs/sites can be created

#### Scenario 2: Staff User Flow
1. Login with staff@example.com / staff123
2. Click "My Organization" from dashboard
3. Should see org details and sites
4. Try to create a site → should see no button (not admin)
5. Try accessing /orgs → should see access denied
6. Try accessing /profile → should work

**Expected:** Can view org/sites but not create, cannot access admin features

#### Scenario 3: Organization Detail View
1. As admin, navigate to any organization detail page
2. Left side shows org info (name, timezone, ID, dates)
3. Right side shows sites list
4. Form to create new site (admin only)
5. Can add multiple sites

**Expected:** Layout is clear, sites appear after creation

## Common Test Cases

### ✅ Should Work
```
✓ Login with valid credentials
✓ See dashboard after login
✓ Navigate to profile and see user info
✓ As admin, view all organizations
✓ As admin, create new organization
✓ View organization details
✓ As admin, create site in organization
✓ See sites appear in list
✓ Sign out and get redirected to login
```

### ❌ Should Be Blocked
```
✗ Non-admin trying to access /orgs
✗ Non-admin trying to create organization
✗ Non-admin trying to create site (no button shown)
✗ Unauthenticated user trying to access /dashboard
✗ Accessing /profile without token
```

### 🔄 Should Have Loading States
```
⟳ Fetching organizations
⟳ Creating new organization
⟳ Fetching organization details
⟳ Creating new site
```

### ⚠️ Should Show Errors
```
⚠ API unreachable → "Failed to retrieve organizations"
⚠ Organization deleted → "Organization not found"
⚠ Invalid token → "Unauthorized"
⚠ Network error → Network error message with details
```

## Debugging Tips

### Check in Browser DevTools

**F12 → Console:**
- Look for any error messages
- API calls should show in Network tab
- localStorage should contain: accessToken, refreshToken, user

**F12 → Network:**
- Login request → `/api/v1/auth/login` (200)
- User fetch → `/api/v1/users/me` (200)
- Orgs fetch → `/api/v1/orgs` (200 or 403 if not admin)
- Requests should have `Authorization: Bearer <token>` header

**F12 → Application → Storage:**
- localStorage should have:
  - `accessToken` (JWT)
  - `refreshToken` (JWT)
  - `user` (JSON with id, email, name, roles, orgId)

### Check API Health
```bash
# Terminal
curl http://localhost:3001/health

# Should return:
# {
#   "status": "ok",
#   "database": "connected",
#   "uptime": 123.456
# }
```

### Check Database
```bash
# Open CouchDB Admin UI
open http://localhost:5984/_utils

# Login with admin/changeme
# Navigate to scheduleright database
# Should see: orgs, users, sites documents
```

## Files Created

### Pages
- `/apps/web/app/(dashboard)/profile/page.tsx` - Profile page
- `/apps/web/app/(dashboard)/orgs/page.tsx` - Organizations list
- `/apps/web/app/(dashboard)/orgs/new/page.tsx` - Create organization
- `/apps/web/app/(dashboard)/orgs/[orgId]/page.tsx` - Organization detail

### Hooks
- `/apps/web/lib/hooks/useApi.ts` - API call hook
- `/apps/web/lib/hooks/useData.ts` - React Query hooks for data fetching

### Documentation
- `DASHBOARD_FEATURES.md` - Complete feature documentation

### Updated Files
- `/apps/web/app/(dashboard)/dashboard/page.tsx` - Added navigation links

## Next Steps

Once dashboard testing is complete, work on:

### Todo #7: Availability & Booking
- Create availability time slots
- Allow booking appointments
- Check for conflicts
- Manage capacity

### Todo #10: Multi-tenant Config  
- Setup custom domains per organization
- Configure subdomain routing
- Test multi-tenant isolation

### Todo #8: Integration Tests
- Test full user flows
- Test RBAC enforcement
- Test database isolation

## Performance Notes

- Uses React Query for smart caching
- Pages lazy load with Next.js code splitting
- TanStack Query mutations auto-invalidate related caches
- CSS in JS with Tailwind (no extra HTTP requests)

## Security Checks

✅ JWT tokens used for all API calls
✅ Tokens expire after 15 minutes (access) / 30 days (refresh)
✅ RBAC enforced on backend (no client-side auth bypass)
✅ Users can only see their organization data
✅ Admin endpoints return 403 for non-admins
✅ Logout clears all auth data from localStorage

## Known Limitations (MVP)

- Cannot edit organization details yet
- Cannot delete organizations
- Cannot edit/delete sites
- Profile picture not supported
- No user management UI yet
- No organization members list yet
- No activity logging yet

These will be added in future iterations.

## Getting Help

1. **Check [DASHBOARD_FEATURES.md](DASHBOARD_FEATURES.md)** for detailed docs
2. **Check [TEST_AUTH_ENDPOINTS.md](TEST_AUTH_ENDPOINTS.md)** for auth testing
3. **Visit http://localhost:3001/status** for API health
4. **Check browser console** (F12) for error messages
5. **Check server logs** in terminal running `pnpm dev`

---

**Happy testing!** 🚀
