# Auth Endpoint Testing Guide

This guide walks you through testing all authentication endpoints to verify the auth system works end-to-end.

## Prerequisites

Before testing, make sure:

1. **CouchDB is running**:
   ```bash
   docker-compose up -d
   docker-compose ps  # Should show couchdb is healthy
   ```

2. **Dev servers are running**:
   ```bash
   pnpm dev
   # Wait for all servers to start
   ```

3. **Database is seeded** (run in another terminal):
   ```bash
   pnpm --filter=@scheduleright/server seed
   ```

4. **API is accessible**:
   ```bash
   curl http://localhost:3001/health
   # Should return JSON with status: "ok"
   ```

---

## Test Credentials

The seeded database creates these test users:

| Email | Password | Role | Purpose |
|-------|----------|------|---------|
| admin@example.com | admin123 | ADMIN | Full system access |
| staff@example.com | staff123 | STAFF | Can manage schedules |
| volunteer@example.com | volunteer123 | VOLUNTEER | Limited access |
| client@example.com | client123 | CLIENT | View-only access |

---

## Testing with curl

### 1️⃣ Login Test

**Test Case:** User can log in with valid credentials

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123"
  }' \
  -v
```

**Expected Response** (200 OK):
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
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**What to verify:**
- ✅ Status is 200
- ✅ Response has `accessToken` and `refreshToken`
- ✅ `user.email` matches request
- ✅ `user.roles` contains ["ADMIN"]
- ✅ Cookies are set: Check with `-v` flag, should see `Set-Cookie: accessToken=...` and `Set-Cookie: refreshToken=...`

---

### 2️⃣ Invalid Password Test

**Test Case:** Invalid password is rejected

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "wrongpassword"
  }'
```

**Expected Response** (401 Unauthorized):
```json
{
  "error": "Invalid email or password",
  "code": "INVALID_CREDENTIALS",
  "statusCode": 401,
  "timestamp": "2026-01-16T12:00:00.000Z"
}
```

**What to verify:**
- ✅ Status is 401
- ✅ Error message is clear

---

### 3️⃣ Invalid Email Test

**Test Case:** Non-existent email is rejected

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nonexistent@example.com",
    "password": "password123"
  }'
```

**Expected Response** (401 Unauthorized):
```json
{
  "error": "Invalid email or password",
  "code": "INVALID_CREDENTIALS",
  "statusCode": 401,
  "timestamp": "2026-01-16T12:00:00.000Z"
}
```

---

### 4️⃣ Refresh Token Test

**Test Case:** Can refresh access token with refresh token

```bash
# First, login to get tokens
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123"
  }')

# Extract refresh token from response
REFRESH_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"refreshToken":"[^"]*' | cut -d'"' -f4)

# Use refresh token to get new access token
curl -X POST http://localhost:3001/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{
    \"refreshToken\": \"$REFRESH_TOKEN\"
  }"
```

**Or simpler - send in request body:**
```bash
curl -X POST http://localhost:3001/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

**Expected Response** (200 OK):
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**What to verify:**
- ✅ Status is 200
- ✅ New `accessToken` is provided
- ✅ New `refreshToken` is provided

---

### 5️⃣ Get Current User Test

**Test Case:** Can get current user info with valid token

```bash
# First login
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123"
  }')

# Extract access token
ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

# Get current user
curl -X GET http://localhost:3001/api/v1/users/me \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**Expected Response** (200 OK):
```json
{
  "id": "user:admin-001",
  "email": "admin@example.com",
  "orgId": "org:test-001",
  "roles": ["ADMIN"]
}
```

**What to verify:**
- ✅ Status is 200
- ✅ Returns current user info
- ✅ User ID matches the logged-in user

---

### 6️⃣ Unauthorized Access Test

**Test Case:** Cannot access protected route without token

```bash
curl -X GET http://localhost:3001/api/v1/users/me
```

**Expected Response** (401 Unauthorized):
```json
{
  "error": "Missing or invalid token",
  "code": "UNAUTHORIZED",
  "statusCode": 401,
  "timestamp": "2026-01-16T12:00:00.000Z"
}
```

**What to verify:**
- ✅ Status is 401
- ✅ Access is denied

---

### 7️⃣ Invalid Token Test

**Test Case:** Invalid token is rejected

```bash
curl -X GET http://localhost:3001/api/v1/users/me \
  -H "Authorization: Bearer invalid.token.here"
```

**Expected Response** (401 Unauthorized):
```json
{
  "error": "Invalid token",
  "code": "INVALID_TOKEN",
  "statusCode": 401,
  "timestamp": "2026-01-16T12:00:00.000Z"
}
```

**What to verify:**
- ✅ Status is 401
- ✅ Invalid tokens are rejected

---

### 8️⃣ Logout Test

**Test Case:** Can log out and clear tokens

```bash
curl -X POST http://localhost:3001/api/v1/auth/logout \
  -H "Content-Type: application/json" \
  -v
```

**Expected Response** (200 OK):
```json
{
  "message": "Logged out successfully",
  "timestamp": "2026-01-16T12:00:00.000Z"
}
```

**What to verify:**
- ✅ Status is 200
- ✅ Cookies are cleared: Check with `-v` flag, should see `Set-Cookie:` with empty values or `Max-Age=0`

---

## Testing with Postman/Insomnia

### Import Collection

You can import this JSON into Postman/Insomnia:

```json
{
  "info": {
    "name": "ScheduleRight Auth API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Login - Admin",
      "event": [{
        "listen": "test",
        "script": {
          "exec": [
            "pm.test('Login successful', function() {",
            "  pm.response.to.have.status(200);",
            "  pm.response.to.have.jsonBody('user.email');",
            "  pm.response.to.have.jsonBody('accessToken');",
            "  pm.response.to.have.jsonBody('refreshToken');",
            "});",
            "pm.environment.set('accessToken', pm.response.json().accessToken);",
            "pm.environment.set('refreshToken', pm.response.json().refreshToken);"
          ]
        }
      }],
      "request": {
        "method": "POST",
        "url": "http://localhost:3001/api/v1/auth/login",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "body": {
          "mode": "raw",
          "raw": "{\"email\": \"admin@example.com\", \"password\": \"admin123\"}"
        }
      }
    },
    {
      "name": "Get Current User",
      "request": {
        "method": "GET",
        "url": "http://localhost:3001/api/v1/users/me",
        "header": [{
          "key": "Authorization",
          "value": "Bearer {{accessToken}}"
        }]
      }
    },
    {
      "name": "Refresh Token",
      "request": {
        "method": "POST",
        "url": "http://localhost:3001/api/v1/auth/refresh",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "body": {
          "mode": "raw",
          "raw": "{\"refreshToken\": \"{{refreshToken}}\"}"
        }
      }
    },
    {
      "name": "Logout",
      "request": {
        "method": "POST",
        "url": "http://localhost:3001/api/v1/auth/logout",
        "header": [{"key": "Content-Type", "value": "application/json"}]
      }
    }
  ]
}
```

### Steps:
1. Open Postman/Insomnia
2. Create new collection
3. Add requests from above
4. Run "Login - Admin" first
5. Other requests will use the stored tokens
6. Verify all pass ✅

---

## Testing with Web UI (Browser)

### 1. Test Login Form

1. Go to http://localhost:3000
2. You should see the login page
3. Enter credentials:
   - Email: `admin@example.com`
   - Password: `admin123`
4. Click "Login"
5. Should redirect to dashboard

### 2. Test with Different Roles

Repeat with each user:

```
1. admin@example.com / admin123 → ADMIN access
2. staff@example.com / staff123 → STAFF access
3. volunteer@example.com / volunteer123 → VOLUNTEER access
4. client@example.com / client123 → CLIENT access
```

### 3. Inspect Network Tab

1. Open DevTools (F12)
2. Go to Network tab
3. Try to login
4. Look for these requests:
   - `POST /api/v1/auth/login` → Should be 200 OK
   - Should see Set-Cookie headers
5. Check Console tab for any errors

### 4. Check Token in Storage

In DevTools → Application → Cookies:
- Should see `accessToken` (expires in 15 mins)
- Should see `refreshToken` (expires in 30 days)

---

## Testing Different Scenarios

### Scenario 1: Full Auth Flow (Happy Path)

```bash
# 1. Login
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "admin123"}' \
  -c cookies.txt

# 2. Access protected resource (with stored cookies)
curl -X GET http://localhost:3001/api/v1/users/me \
  -b cookies.txt

# 3. Logout
curl -X POST http://localhost:3001/api/v1/auth/logout \
  -H "Content-Type: application/json" \
  -b cookies.txt -c cookies.txt

# 4. Try to access protected resource (should fail)
curl -X GET http://localhost:3001/api/v1/users/me \
  -b cookies.txt
```

### Scenario 2: Token Expiration

Tokens expire after 15 minutes. To test:

1. Wait 15 minutes, then try to use access token
2. Should get 401 Unauthorized
3. Use refresh token to get new access token
4. Should work again

### Scenario 3: Role-Based Access Control

Once you implement role-restricted endpoints, test:

```bash
# Admin endpoint - should work as ADMIN
curl -X POST http://localhost:3001/api/v1/orgs \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "New Org"}'

# Same endpoint - should fail as CLIENT
curl -X POST http://localhost:3001/api/v1/orgs \
  -H "Authorization: Bearer $CLIENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "New Org"}'
```

---

## Validation Checklist

### Login Endpoint (/api/v1/auth/login)
- ✅ Valid credentials → 200 with tokens
- ✅ Invalid password → 401
- ✅ Invalid email → 401
- ✅ Missing email → 400 (validation error)
- ✅ Missing password → 400 (validation error)
- ✅ Sets accessToken cookie
- ✅ Sets refreshToken cookie

### Refresh Endpoint (/api/v1/auth/refresh)
- ✅ Valid refresh token → 200 with new tokens
- ✅ Invalid token → 401
- ✅ Expired token → 401
- ✅ Missing token → 400 or 401
- ✅ Updates cookies

### Get Current User (/api/v1/users/me)
- ✅ Valid token → 200 with user info
- ✅ Invalid token → 401
- ✅ Missing token → 401
- ✅ Returns correct user data

### Logout Endpoint (/api/v1/auth/logout)
- ✅ Clears accessToken cookie
- ✅ Clears refreshToken cookie
- ✅ Returns 200

### Token Validation
- ✅ JWT signature is valid
- ✅ Token expiration is enforced
- ✅ Refresh token has different expiration (30d vs 15m)
- ✅ Tokens contain user info (userId, email, roles, orgId)

---

## Common Issues

### "Failed to fetch"
- Check CouchDB is running: `docker-compose ps`
- Check API is running: `curl http://localhost:3001/health`
- Check CORS: Try from browser console

### "Invalid email or password"
- Make sure database is seeded: `pnpm --filter=@scheduleright/server seed`
- Check email is correct (case-sensitive)
- Check password is correct

### "Missing or invalid token"
- Make sure you're sending Authorization header
- Make sure token hasn't expired (15 minutes)
- Use refresh token to get new access token

### Cookies not being set
- Check browser is accepting cookies
- Check `secure` flag in development (should be false)
- Check `sameSite` setting

---

## Next Steps

Once all auth tests pass ✅:

1. **Build Dashboard UI** (Todo #6)
   - Profile page
   - Organization list
   - Site management

2. **Implement RBAC** (Todo #8)
   - Endpoint-level access control
   - Org-level permissions
   - Role-based UI hiding

3. **Test Multi-tenant** (Todo #10)
   - Multiple orgs in one database
   - Org isolation
   - Custom domains

---

## Debugging

### View API Logs

```bash
# In terminal where pnpm dev is running, watch for errors
# Or use:
pm2 logs scheduleright-api
```

### View Database

```bash
# CouchDB Admin UI
open http://localhost:5984/_utils

# Login with admin/changeme
# Navigate to scheduleright database
# View users and orgs
```

### View Browser Network

1. Open DevTools (F12)
2. Go to Network tab
3. Try to login
4. Click on POST request to /api/v1/auth/login
5. See Request and Response details

---

## Success Criteria

You'll know auth is working when:

✅ Can log in with any test user  
✅ Get valid JWT tokens (accessToken + refreshToken)  
✅ Can access /api/v1/users/me with token  
✅ Token expires after 15 minutes  
✅ Can refresh token with refresh token  
✅ Invalid tokens are rejected with 401  
✅ Can log out and clear cookies  
✅ Web UI login form works and redirects to dashboard  

**All of the above = Auth system is production-ready! 🎉**
