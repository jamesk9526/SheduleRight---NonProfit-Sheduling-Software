# Org/Site Endpoints Implementation Summary

Complete implementation of organization and site management endpoints with RBAC protection.

## What Was Built

### 1. Organization Service (`apps/server/src/services/org.service.ts`)
- **listOrgs()**: Query all organizations from CouchDB
- **getOrgById(orgId)**: Fetch single organization
- **createOrg(data)**: Create new organization with auto-generated IDs
- **listSites(orgId)**: Query all sites for an organization
- **getSiteById(siteId)**: Fetch single site
- **createSite(orgId, data)**: Create new site in organization
- **Validation**: Zod schemas for CreateOrgInput and CreateSiteInput

### 2. Organization Routes (`apps/server/src/routes/orgs.ts`)
Implemented 3 endpoints per API_CONTRACTS.md:

**GET /api/v1/orgs** - List all organizations
- RBAC: ADMIN only
- Returns: `{ data: Organization[], total: number }`
- Middleware: authMiddleware → requireRole('ADMIN')

**GET /api/v1/orgs/:orgId** - Get organization details
- RBAC: Org members only (tenancy check)
- Returns: Organization object
- Middleware: authMiddleware → enforceTenancy()
- Errors: 404 if org not found

**POST /api/v1/orgs** - Create organization
- RBAC: ADMIN only
- Body: `{ name, tenantId?, settings? }`
- Returns: Created organization (201)
- Middleware: authMiddleware → requireRole('ADMIN')
- Validation: Zod schema with name 3-100 chars

### 3. Site Routes (`apps/server/src/routes/sites.ts`)
Implemented 2 endpoints per API_CONTRACTS.md:

**GET /api/v1/orgs/:orgId/sites** - List sites in organization
- RBAC: Org members only (tenancy check)
- Returns: `{ data: Site[], total: number }`
- Middleware: authMiddleware → enforceTenancy()
- Validation: Verifies org exists (404 if not)

**POST /api/v1/orgs/:orgId/sites** - Create site
- RBAC: STAFF or ADMIN only
- Body: `{ name, address?, timezone }`
- Returns: Created site (201)
- Middleware: authMiddleware → requireRole('STAFF', 'ADMIN') → enforceTenancy()
- Validation: Zod schema + org existence check

### 4. Server Integration (`apps/server/src/index.ts`)
- Imported createOrgService from org.service
- Imported registerOrgRoutes and registerSiteRoutes
- Created orgService instance with CouchDB connection
- Registered org and site routes

## Key Features

### RBAC Protection
Every endpoint protected with role-based access control:
- **ADMIN**: Can list all orgs, create orgs, access any org's data
- **STAFF**: Can create sites, access own org's data
- **VOLUNTEER/CLIENT**: Can view own org's data (read-only)

### Tenancy Enforcement
All org-scoped endpoints validate:
- User's JWT `orgId` must match URL `:orgId` parameter
- Prevents cross-org data access
- Enforced by `enforceTenancy()` middleware

### Error Handling
Standardized error responses:
```json
{
  "error": "Human-readable message",
  "code": "ERROR_CODE",
  "statusCode": 400,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

Error codes:
- `ORG_LIST_FAILED`, `ORG_GET_FAILED`, `ORG_CREATE_FAILED`
- `SITE_LIST_FAILED`, `SITE_CREATE_FAILED`
- `ORG_NOT_FOUND` (404)
- `VALIDATION_ERROR` (400)
- `INSUFFICIENT_PERMISSIONS` (403)
- `FORBIDDEN_ORG_ACCESS` (403)

### Validation
- Zod schemas for all request bodies
- Name field: 3-100 characters
- Timezone: string (IANA format expected)
- Address: optional string

### Data Model
**Organization**:
```typescript
{
  _id: string           // "org:uuid"
  type: "org"
  id: string            // Same as _id
  name: string          // Organization name
  tenantId: string      // "tenant:uuid"
  settings: {
    timezone: string    // US/Eastern, etc.
    businessHours?: string
    requireVerification?: boolean
  }
  createdAt: string     // ISO 8601
  updatedAt: string
}
```

**Site**:
```typescript
{
  _id: string           // "site:uuid"
  type: "site"
  id: string            // Same as _id
  orgId: string         // "org:uuid"
  name: string          // Site name
  address?: string      // Physical address
  timezone: string      // US/Eastern, etc.
  createdAt: string     // ISO 8601
  updatedAt: string
}
```

## Files Created/Modified

### New Files (3)
1. `apps/server/src/services/org.service.ts` (229 lines)
   - Organization and site CRUD operations
   - Zod validation schemas
   - Type definitions

2. `apps/server/src/routes/orgs.ts` (126 lines)
   - 3 organization endpoints with RBAC
   - Error handling and validation

3. `apps/server/src/routes/sites.ts` (115 lines)
   - 2 site endpoints with RBAC
   - Org existence validation

### Modified Files (1)
1. `apps/server/src/index.ts`
   - Imported org service and routes
   - Created orgService instance
   - Registered org and site routes

## TypeScript Status
✅ All files compile successfully
- 0 errors
- Strict mode enabled
- Proper type safety with Zod inference

## Testing Status
📝 Complete testing guide created in `ORG_SITE_TESTING.md`
- curl examples for all endpoints
- RBAC testing scenarios (ADMIN, STAFF, VOLUNTEER)
- Expected responses and error cases
- Test credentials reference
- Postman/Insomnia setup guide

## Next Steps

### Immediate Testing
1. Start server: `pnpm dev`
2. Seed database: `pnpm --filter=@scheduleright/server seed`
3. Test endpoints using curl examples from `ORG_SITE_TESTING.md`

### Future Enhancements
1. **Pagination**: Add skip/limit query params for list endpoints
2. **Update/Delete**: Add PUT/PATCH/DELETE endpoints for orgs and sites
3. **Search/Filter**: Add query params for filtering (name, timezone)
4. **Audit Logs**: Track who created/modified orgs and sites
5. **Unit Tests**: Write tests for org.service.ts and route handlers
6. **Integration Tests**: Test full RBAC flows end-to-end

## Known Limitations

1. **No Pagination**: List endpoints return all results (max 1000)
2. **No Updates**: Can only create orgs/sites, not update them
3. **No Soft Deletes**: No delete functionality yet
4. **Basic Validation**: Timezone not validated against IANA list
5. **Auto-IDs**: Cannot specify custom IDs for orgs/sites

## API Compliance

✅ All endpoints match API_CONTRACTS.md specification:
- Correct HTTP methods (GET, POST)
- Correct URL paths (/api/v1/orgs, /api/v1/orgs/:orgId/sites)
- Correct status codes (200, 201, 400, 403, 404, 500)
- Correct RBAC requirements
- Correct error response format
- Correct request/response schemas

## Milestone 1 Backend Status

**Completed**:
- ✅ Auth endpoints (login, refresh, logout, /users/me)
- ✅ Organization endpoints (list, get, create)
- ✅ Site endpoints (list, create)
- ✅ RBAC middleware (requireRole, enforceTenancy)
- ✅ Seed script with test data
- ✅ TypeScript compilation (0 errors)

**Pending**:
- ⏳ Availability endpoints (M1 scope TBD)
- ⏳ Booking endpoints (M1 scope TBD)
- ⏳ Unit tests
- ⏳ Upgrade to bcrypt password hashing
- ⏳ Web UI (login, dashboard)

---

**Implementation Date**: January 16, 2026
**TypeScript Status**: ✅ Passing
**API Contract Compliance**: ✅ 100%
**RBAC Protection**: ✅ Fully implemented
**Tenancy Enforcement**: ✅ Active on all org-scoped endpoints
