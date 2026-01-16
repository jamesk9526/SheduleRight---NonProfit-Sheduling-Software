# Auth Routes - Testing Guide

## Implementation Complete ✅

The following auth endpoints have been implemented:

### Endpoints

1. **POST /api/v1/auth/login** - Login with email/password
2. **POST /api/v1/auth/refresh** - Refresh access token  
3. **POST /api/v1/auth/logout** - Clear session
4. **GET /api/v1/users/me** - Get current user (requires auth)

## Testing the Auth Routes

### 1. Seed Test Data

First, populate the database with test users:

```bash
# Make sure CouchDB is running, then:
pnpm --filter=@scheduleright/server seed
```

This creates:
- **Admin**: admin@example.com / admin123
- **Staff**: staff@example.com / staff123
- **Volunteer**: volunteer@example.com / volunteer123
- **Client**: client@example.com / client123

### 2. Test Login

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123"
  }'
```

**Expected Response (200)**:
```json
{
  "user": {
    "id": "user:admin-001",
    "email": "admin@example.com",
    "name": "Admin User",
    "roles": ["ADMIN"],
    "orgId": "org:test-001",
    "verified": true,
    "active": true
  },
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

Cookies are also set automatically (httpOnly):
- `accessToken` - 15 minute expiry
- `refreshToken` - 30 day expiry

### 3. Test Get Current User

```bash
# Using Authorization header
curl -X GET http://localhost:3001/api/v1/users/me \
  -H "Authorization: Bearer <accessToken from login>"

# Or using cookie (automatic if set)
curl -X GET http://localhost:3001/api/v1/users/me \
  -b "accessToken=<token>"
```

**Expected Response (200)**:
```json
{
  "id": "user:admin-001",
  "email": "admin@example.com",
  "orgId": "org:test-001",
  "roles": ["ADMIN"]
}
```

### 4. Test Refresh Token

```bash
# Using refresh token in body
curl -X POST http://localhost:3001/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "<refreshToken from login>"
  }'

# Or using cookie (automatic if set)
curl -X POST http://localhost:3001/api/v1/auth/refresh
```

**Expected Response (200)**:
```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..." // Optional rotation
}
```

### 5. Test Logout

```bash
curl -X POST http://localhost:3001/api/v1/auth/logout
```

**Expected Response (200)**:
```json
{
  "message": "Logged out successfully",
  "timestamp": "2024-01-16T10:30:00Z"
}
```

## Error Cases

### Invalid Credentials (401)
```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "wrong"
  }'
```

Response:
```json
{
  "error": "Invalid email or password",
  "code": "INVALID_CREDENTIALS",
  "statusCode": 401,
  "timestamp": "2024-01-16T10:30:00Z"
}
```

### Missing Token (401)
```bash
curl -X GET http://localhost:3001/api/v1/users/me
```

Response:
```json
{
  "error": "Missing authentication token",
  "code": "MISSING_TOKEN",
  "statusCode": 401,
  "timestamp": "2024-01-16T10:30:00Z"
}
```

### Invalid Token (401)
```bash
curl -X GET http://localhost:3001/api/v1/users/me \
  -H "Authorization: Bearer invalid_token"
```

Response:
```json
{
  "error": "Invalid or expired authentication token",
  "code": "INVALID_TOKEN",
  "statusCode": 401,
  "timestamp": "2024-01-16T10:30:00Z"
}
```

## Using Postman / Insomnia

1. **Create Environment Variables**:
   - `base_url` = `http://localhost:3001`
   - `access_token` = (will be set automatically)
   - `refresh_token` = (will be set automatically)

2. **Login Request**:
   - Method: `POST`
   - URL: `{{base_url}}/api/v1/auth/login`
   - Body (JSON):
     ```json
     {
       "email": "admin@example.com",
       "password": "admin123"
     }
     ```
   - Script (Post-request):
     ```javascript
     pm.environment.set("access_token", pm.response.json().accessToken);
     pm.environment.set("refresh_token", pm.response.json().refreshToken);
     ```

3. **Get Current User Request**:
   - Method: `GET`
   - URL: `{{base_url}}/api/v1/users/me`
   - Headers: `Authorization: Bearer {{access_token}}`

## Notes

- Tokens are short-lived (15 min access, 30 day refresh)
- Passwords are hashed (currently using base64 for MVP - **TODO**: replace with bcrypt)
- Refresh tokens can be used to get new access tokens
- All endpoints return standardized error responses with `code` and `statusCode`
- Cookies are `httpOnly`, `secure` (in production), and `sameSite=strict`

## Next Steps

After verifying auth works:
1. Implement org/site endpoints with RBAC
2. Add bcrypt for proper password hashing
3. Create login UI in apps/web
4. Add unit tests for auth service
