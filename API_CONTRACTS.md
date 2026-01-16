# API Contract - Milestone 1

> **Note**: This is the API specification for M1. Routes should match these contracts exactly.
> Implement all routes in `apps/server/src/routes/` with proper error handling and RBAC.

---

## Authentication Endpoints

### `POST /api/v1/auth/login`

**Request**
```json
{
  "email": "staff@example.com",
  "password": "password123"
}
```

**Response (200 OK)**
```json
{
  "user": {
    "id": "user-uuid",
    "email": "staff@example.com",
    "name": "Staff Member",
    "roles": ["STAFF"],
    "orgId": "org-uuid",
    "verified": true,
    "active": true
  },
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

**Error (401 Unauthorized)**
```json
{
  "error": "Invalid email or password"
}
```

**Error (429 Too Many Requests)** (after 5 failed attempts)
```json
{
  "error": "Too many login attempts. Try again in 15 minutes."
}
```

**Implementation Notes**:
- Hash passwords with bcrypt (or argon2i)
- Set refreshToken in secure httpOnly cookie
- Return accessToken in response body
- Rate limit: 5 attempts per 15 minutes per IP
- Account lockout after 10 failed attempts (24 hours)

---

### `POST /api/v1/auth/refresh`

**Request** (no body required, uses refresh token from cookie)
```
Headers:
  Cookie: refreshToken=eyJhbGc...
```

**Response (200 OK)**
```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..." // optional, rotate if policy requires
}
```

**Error (401 Unauthorized)**
```json
{
  "error": "Invalid or expired refresh token"
}
```

**Implementation Notes**:
- Extract refreshToken from httpOnly cookie
- Verify JWT signature and expiration
- Issue new accessToken (7-day expiry)
- Optional: Rotate refreshToken (30-day expiry)
- Track token version to prevent replay attacks

---

### `POST /api/v1/auth/logout`

**Request**
```
Headers:
  Authorization: Bearer eyJhbGc...
```

**Response (200 OK)**
```json
{
  "message": "Logged out successfully"
}
```

**Implementation Notes**:
- Clear refreshToken cookie
- Optional: Add accessToken to blacklist/revocation list
- No validation needed (any token works)

---

## User Endpoints

### `GET /api/v1/users/me`

Get current authenticated user profile

**Request**
```
Headers:
  Authorization: Bearer eyJhbGc...
```

**Response (200 OK)**
```json
{
  "id": "user-uuid",
  "email": "staff@example.com",
  "name": "Staff Member",
  "roles": ["STAFF"],
  "orgId": "org-uuid",
  "verified": true,
  "active": true,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

**Error (401 Unauthorized)**
```json
{
  "error": "Missing or invalid authentication token"
}
```

**Implementation Notes**:
- Extract user from JWT
- Return full user object (no password)
- Requires RBAC check (all authenticated users)

---

## Organization Endpoints

### `GET /api/v1/orgs`

List organizations (ADMIN only)

**Request**
```
Headers:
  Authorization: Bearer eyJhbGc...
```

**Response (200 OK)**
```json
{
  "data": [
    {
      "id": "org-uuid-1",
      "name": "Community Center",
      "tenantId": "tenant-uuid-1",
      "settings": {
        "timezone": "US/Eastern",
        "businessHours": "8AM-8PM",
        "requireVerification": true
      },
      "createdAt": "2024-01-10T00:00:00Z",
      "updatedAt": "2024-01-10T00:00:00Z"
    }
  ],
  "total": 1
}
```

**Error (403 Forbidden)**
```json
{
  "error": "Insufficient permissions (requires ADMIN role)"
}
```

**Implementation Notes**:
- RBAC: ADMIN role only
- Return all organizations (no filtering needed in M1)
- Pagination: skip, limit params (optional for M1)

---

### `GET /api/v1/orgs/:orgId`

Get organization details (org members only)

**Request**
```
Headers:
  Authorization: Bearer eyJhbGc...
```

**Response (200 OK)**
```json
{
  "id": "org-uuid",
  "name": "Community Center",
  "tenantId": "tenant-uuid",
  "settings": {
    "timezone": "US/Eastern"
  },
  "createdAt": "2024-01-10T00:00:00Z",
  "updatedAt": "2024-01-10T00:00:00Z"
}
```

**Error (403 Forbidden)**
```json
{
  "error": "Access denied to this organization"
}
```

**Error (404 Not Found)**
```json
{
  "error": "Organization not found"
}
```

**Implementation Notes**:
- RBAC: User must be member of specified org
- Tenancy check: User's orgId must match :orgId param
- Return 404 if org doesn't exist

---

### `POST /api/v1/orgs`

Create new organization (ADMIN only)

**Request**
```json
{
  "name": "New Community Center",
  "tenantId": "tenant-uuid-or-auto",
  "settings": {
    "timezone": "US/Eastern"
  }
}
```

**Response (201 Created)**
```json
{
  "id": "org-uuid",
  "name": "New Community Center",
  "tenantId": "tenant-uuid",
  "settings": {
    "timezone": "US/Eastern"
  },
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

**Error (403 Forbidden)**
```json
{
  "error": "Insufficient permissions (requires ADMIN role)"
}
```

**Error (400 Bad Request)**
```json
{
  "error": "Invalid request: name is required"
}
```

**Implementation Notes**:
- RBAC: ADMIN role only
- Validate: name (required, 3-100 chars), timezone (valid IANA)
- Auto-generate tenantId if not provided (UUID)
- Store in CouchDB with type=org

---

## Site Endpoints

### `GET /api/v1/orgs/:orgId/sites`

List sites in organization

**Request**
```
Headers:
  Authorization: Bearer eyJhbGc...
```

**Response (200 OK)**
```json
{
  "data": [
    {
      "id": "site-uuid",
      "orgId": "org-uuid",
      "name": "Main Campus",
      "address": "123 Main St, Boston MA",
      "timezone": "US/Eastern",
      "createdAt": "2024-01-10T00:00:00Z",
      "updatedAt": "2024-01-10T00:00:00Z"
    }
  ],
  "total": 1
}
```

**Error (403 Forbidden)**
```json
{
  "error": "Access denied to this organization"
}
```

**Implementation Notes**:
- RBAC: User must be member of org
- Tenancy: Filter by orgId from JWT
- Return empty array if no sites

---

### `POST /api/v1/orgs/:orgId/sites`

Create site in organization

**Request**
```json
{
  "name": "Downtown Location",
  "address": "456 Oak Ave, Boston MA",
  "timezone": "US/Eastern"
}
```

**Response (201 Created)**
```json
{
  "id": "site-uuid",
  "orgId": "org-uuid",
  "name": "Downtown Location",
  "address": "456 Oak Ave, Boston MA",
  "timezone": "US/Eastern",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

**Error (403 Forbidden)**
```json
{
  "error": "Insufficient permissions (requires STAFF or ADMIN)"
}
```

**Implementation Notes**:
- RBAC: STAFF, ADMIN only
- Tenancy: Validate orgId matches user's org
- Validate: name (required), timezone (valid IANA)
- Store in CouchDB with type=site

---

## Error Response Format

All errors follow this format:

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "statusCode": 400,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Common Error Codes

| Code | Status | Meaning |
|------|--------|---------|
| `INVALID_TOKEN` | 401 | Missing or malformed JWT |
| `TOKEN_EXPIRED` | 401 | JWT has expired |
| `INSUFFICIENT_PERMISSIONS` | 403 | User lacks required role |
| `RESOURCE_NOT_FOUND` | 404 | Resource doesn't exist |
| `VALIDATION_ERROR` | 400 | Invalid request body |
| `DUPLICATE_RESOURCE` | 409 | Resource already exists |
| `DATABASE_ERROR` | 500 | CouchDB/internal error |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |

---

## RBAC Matrix

| Endpoint | ADMIN | STAFF | VOLUNTEER | CLIENT | Notes |
|----------|-------|-------|-----------|--------|-------|
| POST /auth/login | ✅ | ✅ | ✅ | ✅ | Open (any email) |
| GET /users/me | ✅ | ✅ | ✅ | ✅ | Any authenticated user |
| GET /orgs | ✅ | ❌ | ❌ | ❌ | Admins only |
| GET /orgs/:orgId | ✅ | ✅ | ✅ | ✅ | Org members only |
| POST /orgs | ✅ | ❌ | ❌ | ❌ | Admins only |
| GET /orgs/:orgId/sites | ✅ | ✅ | ✅ | ❌ | Staff+ |
| POST /orgs/:orgId/sites | ✅ | ✅ | ❌ | ❌ | Staff+ |

---

## Seed Data for M1

Create test data in `apps/server/src/seeds/seed.ts`:

```typescript
{
  org: {
    id: "org-test-123",
    name: "Test Community Center",
    tenantId: "tenant-test-123"
  },
  users: [
    {
      id: "user-admin-1",
      email: "admin@example.com",
      name: "Admin User",
      roles: ["ADMIN"],
      orgId: "org-test-123"
    },
    {
      id: "user-staff-1",
      email: "staff@example.com",
      name: "Staff Member",
      roles: ["STAFF"],
      orgId: "org-test-123"
    },
    {
      id: "user-volunteer-1",
      email: "volunteer@example.com",
      name: "Volunteer",
      roles: ["VOLUNTEER"],
      orgId: "org-test-123"
    }
  ],
  sites: [
    {
      id: "site-main-1",
      orgId: "org-test-123",
      name: "Main Campus",
      address: "123 Main St, Boston MA",
      timezone: "US/Eastern"
    }
  ]
}
```

---

## Testing Checklist for M1

### Auth Routes
- ✅ POST /login with valid credentials → 200, user + tokens
- ✅ POST /login with invalid email → 401
- ✅ POST /login with invalid password → 401
- ✅ POST /login rate limiting (5+ attempts) → 429
- ✅ POST /refresh with valid token → 200, new accessToken
- ✅ POST /refresh with invalid token → 401
- ✅ POST /logout → 200, clears cookie

### RBAC Middleware
- ✅ Request without Authorization header → 401
- ✅ Request with invalid JWT → 401
- ✅ STAFF accessing admin endpoint → 403
- ✅ User accessing different org → 403
- ✅ Valid user accessing allowed endpoint → 200

### Organization & Site Endpoints
- ✅ GET /orgs returns only admin user
- ✅ GET /orgs/:orgId checks RBAC + tenancy
- ✅ POST /orgs requires ADMIN role
- ✅ POST /orgs validates name + timezone
- ✅ Sites inherit org's timezone
- ✅ Invalid timezone rejected (400)

---

**Next**: Implement routes in apps/server/src/routes/auth.ts, then add RBAC middleware.
