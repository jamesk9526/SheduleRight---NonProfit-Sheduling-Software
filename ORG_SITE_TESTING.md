# Org/Site Endpoints Testing Guide

Complete guide to testing organization and site endpoints with RBAC protection.

## Prerequisites

1. **Start the server**:
   ```bash
   pnpm dev
   ```

2. **Seed test data**:
   ```bash
   pnpm --filter=@scheduleright/server seed
   ```

3. **Get access token**:
   ```bash
   # Login as admin
   curl -X POST http://localhost:3001/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@example.com","password":"admin123"}'
   
   # Save the accessToken from response
   ```

---

## Organization Endpoints

### GET /api/v1/orgs - List All Organizations

**RBAC**: ADMIN only

**Test as ADMIN** (should succeed):
```bash
curl -X GET http://localhost:3001/api/v1/orgs \
  -H "Authorization: Bearer <admin_access_token>"
```

**Expected Response (200)**:
```json
{
  "data": [
    {
      "_id": "org:test-001",
      "_rev": "1-xxx",
      "type": "org",
      "id": "org:test-001",
      "name": "Test Community Center",
      "tenantId": "tenant:test-001",
      "settings": {
        "timezone": "US/Eastern",
        "businessHours": "8AM-8PM",
        "requireVerification": true
      },
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z"
    }
  ],
  "total": 1
}
```

**Test as STAFF** (should fail):
```bash
# Login as staff
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"staff@example.com","password":"staff123"}'

# Try to list orgs (should get 403)
curl -X GET http://localhost:3001/api/v1/orgs \
  -H "Authorization: Bearer <staff_access_token>"
```

**Expected Error (403)**:
```json
{
  "error": "Access denied: Insufficient permissions",
  "code": "INSUFFICIENT_PERMISSIONS",
  "statusCode": 403,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

### GET /api/v1/orgs/:orgId - Get Organization Details

**RBAC**: User must be member of org

**Test as org member** (should succeed):
```bash
curl -X GET http://localhost:3001/api/v1/orgs/org:test-001 \
  -H "Authorization: Bearer <staff_access_token>"
```

**Expected Response (200)**:
```json
{
  "_id": "org:test-001",
  "_rev": "1-xxx",
  "type": "org",
  "id": "org:test-001",
  "name": "Test Community Center",
  "tenantId": "tenant:test-001",
  "settings": {
    "timezone": "US/Eastern",
    "businessHours": "8AM-8PM",
    "requireVerification": true
  },
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T10:00:00.000Z"
}
```

**Test accessing different org** (should fail):
```bash
curl -X GET http://localhost:3001/api/v1/orgs/org:other-org \
  -H "Authorization: Bearer <staff_access_token>"
```

**Expected Error (403)**:
```json
{
  "error": "Access denied: User can only access their own organization",
  "code": "FORBIDDEN_ORG_ACCESS",
  "statusCode": 403,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Test non-existent org** (should fail):
```bash
curl -X GET http://localhost:3001/api/v1/orgs/org:nonexistent \
  -H "Authorization: Bearer <admin_access_token>"
```

**Expected Error (404)**:
```json
{
  "error": "Organization not found",
  "code": "ORG_NOT_FOUND",
  "statusCode": 404,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

### POST /api/v1/orgs - Create Organization

**RBAC**: ADMIN only

**Test as ADMIN** (should succeed):
```bash
curl -X POST http://localhost:3001/api/v1/orgs \
  -H "Authorization: Bearer <admin_access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Community Center",
    "settings": {
      "timezone": "US/Pacific"
    }
  }'
```

**Expected Response (201)**:
```json
{
  "_id": "org:uuid-generated",
  "_rev": "1-xxx",
  "type": "org",
  "id": "org:uuid-generated",
  "name": "New Community Center",
  "tenantId": "tenant:uuid-generated",
  "settings": {
    "timezone": "US/Pacific"
  },
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

**Test with invalid data** (should fail):
```bash
curl -X POST http://localhost:3001/api/v1/orgs \
  -H "Authorization: Bearer <admin_access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "AB"
  }'
```

**Expected Error (400)**:
```json
{
  "error": "Invalid request: String must contain at least 3 character(s)",
  "code": "VALIDATION_ERROR",
  "statusCode": 400,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Test as STAFF** (should fail):
```bash
curl -X POST http://localhost:3001/api/v1/orgs \
  -H "Authorization: Bearer <staff_access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Another Center",
    "settings": {
      "timezone": "US/Central"
    }
  }'
```

**Expected Error (403)**:
```json
{
  "error": "Access denied: Insufficient permissions",
  "code": "INSUFFICIENT_PERMISSIONS",
  "statusCode": 403,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## Site Endpoints

### GET /api/v1/orgs/:orgId/sites - List Sites

**RBAC**: User must be member of org

**Test as org member** (should succeed):
```bash
curl -X GET http://localhost:3001/api/v1/orgs/org:test-001/sites \
  -H "Authorization: Bearer <staff_access_token>"
```

**Expected Response (200)**:
```json
{
  "data": [
    {
      "_id": "site:main-001",
      "_rev": "1-xxx",
      "type": "site",
      "id": "site:main-001",
      "orgId": "org:test-001",
      "name": "Main Campus",
      "address": "123 Main St, Boston MA",
      "timezone": "US/Eastern",
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z"
    }
  ],
  "total": 1
}
```

**Test accessing different org's sites** (should fail):
```bash
curl -X GET http://localhost:3001/api/v1/orgs/org:other-org/sites \
  -H "Authorization: Bearer <staff_access_token>"
```

**Expected Error (403)**:
```json
{
  "error": "Access denied: User can only access their own organization",
  "code": "FORBIDDEN_ORG_ACCESS",
  "statusCode": 403,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

### POST /api/v1/orgs/:orgId/sites - Create Site

**RBAC**: STAFF or ADMIN only

**Test as STAFF** (should succeed):
```bash
curl -X POST http://localhost:3001/api/v1/orgs/org:test-001/sites \
  -H "Authorization: Bearer <staff_access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Downtown Location",
    "address": "456 Oak Ave, Boston MA",
    "timezone": "US/Eastern"
  }'
```

**Expected Response (201)**:
```json
{
  "_id": "site:uuid-generated",
  "_rev": "1-xxx",
  "type": "site",
  "id": "site:uuid-generated",
  "orgId": "org:test-001",
  "name": "Downtown Location",
  "address": "456 Oak Ave, Boston MA",
  "timezone": "US/Eastern",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

**Test with invalid data** (should fail):
```bash
curl -X POST http://localhost:3001/api/v1/orgs/org:test-001/sites \
  -H "Authorization: Bearer <staff_access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "AB"
  }'
```

**Expected Error (400)**:
```json
{
  "error": "Invalid request: String must contain at least 3 character(s)",
  "code": "VALIDATION_ERROR",
  "statusCode": 400,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Test as VOLUNTEER** (should fail):
```bash
# Login as volunteer
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"volunteer@example.com","password":"volunteer123"}'

# Try to create site (should get 403)
curl -X POST http://localhost:3001/api/v1/orgs/org:test-001/sites \
  -H "Authorization: Bearer <volunteer_access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Site",
    "address": "789 Pine Rd, Boston MA",
    "timezone": "US/Eastern"
  }'
```

**Expected Error (403)**:
```json
{
  "error": "Access denied: Insufficient permissions",
  "code": "INSUFFICIENT_PERMISSIONS",
  "statusCode": 403,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Test creating in different org** (should fail):
```bash
curl -X POST http://localhost:3001/api/v1/orgs/org:other-org/sites \
  -H "Authorization: Bearer <staff_access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Site in Other Org",
    "timezone": "US/Pacific"
  }'
```

**Expected Error (403)**:
```json
{
  "error": "Access denied: User can only access their own organization",
  "code": "FORBIDDEN_ORG_ACCESS",
  "statusCode": 403,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## Test Credentials

| User | Email | Password | Role | Org ID |
|------|-------|----------|------|---------|
| Admin | admin@example.com | admin123 | ADMIN | org:test-001 |
| Staff | staff@example.com | staff123 | STAFF | org:test-001 |
| Volunteer | volunteer@example.com | volunteer123 | VOLUNTEER | org:test-001 |
| Client | client@example.com | client123 | CLIENT | org:test-001 |

---

## RBAC Summary

| Endpoint | ADMIN | STAFF | VOLUNTEER | CLIENT |
|----------|-------|-------|-----------|--------|
| GET /orgs | ✅ | ❌ | ❌ | ❌ |
| GET /orgs/:orgId | ✅ | ✅ | ✅ | ✅ |
| POST /orgs | ✅ | ❌ | ❌ | ❌ |
| GET /orgs/:orgId/sites | ✅ | ✅ | ✅ | ✅ |
| POST /orgs/:orgId/sites | ✅ | ✅ | ❌ | ❌ |

**Note**: All endpoints require authentication. Users can only access data from their own organization (tenancy enforcement).

---

## Postman/Insomnia Setup

### Environment Variables
```json
{
  "baseUrl": "http://localhost:3001",
  "adminToken": "<admin_access_token>",
  "staffToken": "<staff_access_token>",
  "volunteerToken": "<volunteer_access_token>",
  "orgId": "org:test-001"
}
```

### Requests Collection
1. **Auth/Login** → Save tokens to environment
2. **Orgs/List** → Use `{{adminToken}}`
3. **Orgs/Get** → Use `{{staffToken}}` and `{{orgId}}`
4. **Orgs/Create** → Use `{{adminToken}}`
5. **Sites/List** → Use `{{staffToken}}` and `{{orgId}}`
6. **Sites/Create** → Use `{{staffToken}}` and `{{orgId}}`

---

## Common Errors

### 401 - Unauthorized
- Token missing or invalid
- Token expired (accessToken expires in 15 minutes)
- Solution: Login again to get fresh token

### 403 - Forbidden (Insufficient Permissions)
- User doesn't have required role
- Example: VOLUNTEER trying to create site
- Solution: Use account with correct role

### 403 - Forbidden (Org Access)
- User trying to access different org's data
- User's orgId doesn't match :orgId param
- Solution: Use correct orgId from user's JWT

### 404 - Not Found
- Organization or site doesn't exist
- Check that ID is correct format (org:xxx or site:xxx)
- Solution: Verify entity exists first

### 400 - Validation Error
- Missing required fields
- Invalid field values (name too short, invalid timezone)
- Solution: Check request body matches schema
