# ScheduleRight Troubleshooting Guide

**Last Updated:** January 16, 2026  
**Version:** 1.0

---

## Table of Contents

1. [Database Connection Issues](#database-connection-issues)
2. [Authentication Failures](#authentication-failures)
3. [Performance Problems](#performance-problems)
4. [Server Won't Start](#server-wont-start)
5. [API Errors](#api-errors)
6. [Web Application Issues](#web-application-issues)
7. [Deployment Problems](#deployment-problems)
8. [Logging & Debugging](#logging--debugging)

---

## Database Connection Issues

### Problem: Can't connect to CouchDB

**Symptoms:**
- Error: `ECONNREFUSED`
- Server logs: "Database connection failed"
- Health check fails

**Solutions:**

1. **Check CouchDB status:**
```bash
sudo systemctl status couchdb
# If not running:
sudo systemctl start couchdb
```

2. **Verify CouchDB is accessible:**
```bash
curl http://localhost:5713
# Should return: {"couchdb":"Welcome","version":"3.3.x"}
```

3. **Check credentials:**
```bash
# Test admin access
curl http://admin:password@localhost:5713/_all_dbs
# Should return list of databases
```

4. **Verify COUCHDB_URL in .env:**
```env
# Should be:
COUCHDB_URL=http://localhost:5713
COUCHDB_USER=admin
COUCHDB_PASSWORD=your-password
```

5. **Check CouchDB logs:**
```bash
sudo tail -f /var/log/couchdb/couchdb.log
```

---

### Problem: Database not found

**Symptoms:**
- Error: `Database scheduleright does not exist`
- 404 errors on database operations

**Solutions:**

1. **Create database manually:**
```bash
curl -X PUT http://admin:password@localhost:5713/scheduleright
```

2. **Verify database exists:**
```bash
curl http://admin:password@localhost:5713/_all_dbs
# Should include "scheduleright"
```

3. **Create indexes:**
```bash
cd /opt/scheduleright/apps/server
npm run db:indexes
```

---

### Problem: Database timeout errors

**Symptoms:**
- Slow query responses
- Timeout errors in logs
- Health check degraded

**Solutions:**

1. **Check database size:**
```bash
curl http://admin:password@localhost:5713/scheduleright | jq '.disk_size'
```

2. **Compact database:**
```bash
curl -X POST http://admin:password@localhost:5713/scheduleright/_compact \
  -H "Content-Type: application/json"
```

3. **Check indexes:**
```bash
cd /opt/scheduleright/apps/server
npm run db:indexes:list
```

4. **Monitor slow queries:**
```bash
# Check CouchDB logs for slow queries
sudo grep "slow" /var/log/couchdb/couchdb.log
```

---

## Authentication Failures

### Problem: JWT token invalid

**Symptoms:**
- Error: `Invalid token`
- 401 Unauthorized responses
- Users logged out unexpectedly

**Solutions:**

1. **Check JWT_SECRET is set:**
```bash
cd /opt/scheduleright/apps/server
grep JWT_SECRET .env
# Must be minimum 32 characters
```

2. **Generate new JWT_SECRET:**
```bash
# Generate secure secret
openssl rand -base64 32
# Update .env with new secret
nano .env
# Restart server
pm2 restart scheduleright-server
```

3. **Check token expiry:**
```env
# In .env:
JWT_EXPIRY=900           # 15 minutes
REFRESH_TOKEN_EXPIRY=604800  # 7 days
```

4. **Clear browser cookies:**
- Open browser DevTools
- Application → Cookies → Clear all

---

### Problem: Login fails with correct credentials

**Symptoms:**
- Error: `Invalid email or password`
- Password is correct
- Rate limit errors

**Solutions:**

1. **Check user exists:**
```bash
curl http://admin:password@localhost:5713/scheduleright/_find \
  -H "Content-Type: application/json" \
  -d '{
    "selector": {
      "type": "user",
      "email": "user@example.com"
    },
    "limit": 1
  }'
```

2. **Check rate limiting:**
```bash
# Rate limit: 5 failed attempts per 15 minutes
# Wait 15 minutes or restart server to reset
pm2 restart scheduleright-server
```

3. **Verify password hashing:**
```bash
# Check logs for bcrypt errors
pm2 logs scheduleright-server --lines 50 | grep -i "bcrypt"
```

4. **Reset user password:**
```bash
# Use seed script to create test user
cd /opt/scheduleright/apps/server
npm run seed
```

---

## Performance Problems

### Problem: Slow API responses

**Symptoms:**
- High response times (>1000ms)
- "slow_request" warnings in logs
- Poor user experience

**Solutions:**

1. **Check metrics:**
```bash
curl http://localhost:5710/metrics | jq '.endpoints | to_entries | sort_by(.value.avgDuration) | reverse | .[0:5]'
# Shows top 5 slowest endpoints
```

2. **Verify database indexes:**
```bash
cd /opt/scheduleright/apps/server
npm run db:indexes:list
# Should show 11 indexes
```

3. **Check database performance:**
```bash
curl http://admin:password@localhost:5713/scheduleright | jq '{doc_count, disk_size}'
```

4. **Monitor system resources:**
```bash
# CPU and memory usage
pm2 monit

# System resources
htop

# Check if memory is full
free -h
```

5. **Review slow query logs:**
```bash
pm2 logs scheduleright-server | grep "slow_request"
```

---

### Problem: High memory usage

**Symptoms:**
- Memory usage >80%
- Server restarts
- Out of memory errors

**Solutions:**

1. **Check current memory:**
```bash
# System memory
free -h

# PM2 process memory
pm2 list
```

2. **Restart services:**
```bash
pm2 restart all
```

3. **Adjust PM2 memory limit:**
```javascript
// In ecosystem.config.js:
max_memory_restart: '1G',  // Restart if exceeds 1GB
```

4. **Check for memory leaks:**
```bash
# Monitor over time
pm2 monit

# Check heap snapshots
curl http://localhost:5710/metrics | jq '.system.memory'
```

---

## Server Won't Start

### Problem: Server fails to start

**Symptoms:**
- PM2 shows "errored" status
- Port already in use errors
- Environment variable errors

**Solutions:**

1. **Check PM2 status:**
```bash
pm2 status
pm2 logs scheduleright-server --err --lines 50
```

2. **Verify environment variables:**
```bash
cd /opt/scheduleright/apps/server
cat .env

# Required variables:
# NODE_ENV, SERVER_PORT, COUCHDB_URL, COUCHDB_USER, COUCHDB_PASSWORD, JWT_SECRET
```

3. **Check port availability:**
```bash
# Check if port 3001 is in use
sudo lsof -i :3001

# Kill process if needed
sudo kill -9 <PID>
```

4. **Test server manually:**
```bash
cd /opt/scheduleright/apps/server
node dist/index.js
# Watch for startup errors
```

5. **Check file permissions:**
```bash
ls -la /opt/scheduleright/apps/server/dist/
# Should be readable by current user
```

---

### Problem: Build fails

**Symptoms:**
- `pnpm build` errors
- TypeScript compilation errors
- Missing dependencies

**Solutions:**

1. **Clean and reinstall:**
```bash
cd /opt/scheduleright
rm -rf node_modules
pnpm install
```

2. **Check Node.js version:**
```bash
node --version  # Should be 20.x
pnpm --version  # Should be 8.x
```

3. **Clear build cache:**
```bash
pnpm clean  # If script exists
rm -rf apps/*/dist
rm -rf apps/*/.next
pnpm build
```

4. **Check for TypeScript errors:**
```bash
cd /opt/scheduleright
pnpm tsc --noEmit
```

---

## API Errors

### Problem: 500 Internal Server Error

**Symptoms:**
- Generic 500 error responses
- No specific error message
- Errors in server logs

**Solutions:**

1. **Check recent error logs:**
```bash
pm2 logs scheduleright-server --err --lines 100
```

2. **Verify database connection:**
```bash
curl http://localhost:5710/health
# Should return: {"status":"healthy"}
```

3. **Check for unhandled errors:**
```bash
# Look for stack traces
pm2 logs scheduleright-server | grep -A 10 "Error:"
```

4. **Enable debug logging:**
```env
# In .env:
LOG_LEVEL=debug
```
```bash
pm2 restart scheduleright-server
```

---

### Problem: 429 Too Many Requests

**Symptoms:**
- Error: `Too many requests, please try again later`
- Rate limit exceeded messages

**Solutions:**

1. **Wait for rate limit reset:**
```bash
# Auth endpoints: 5 requests per 15 minutes
# Standard endpoints: 100 requests per 15 minutes
# Public endpoints: 500 requests per 15 minutes
```

2. **Check rate limit headers:**
```bash
curl -I https://your-domain.com/api/v1/auth/login
# Headers:
# X-RateLimit-Limit: 5
# X-RateLimit-Remaining: 4
# X-RateLimit-Reset: <timestamp>
```

3. **Restart server to reset limits (development only):**
```bash
pm2 restart scheduleright-server
```

4. **Adjust rate limits (if needed):**
```typescript
// In apps/server/src/middleware/rate-limit.ts
// Change windowMs or maxRequests values
```

---

## Web Application Issues

### Problem: Page won't load / blank screen

**Symptoms:**
- White screen
- Loading spinner forever
- Console errors

**Solutions:**

1. **Check browser console:**
```
F12 → Console tab
Look for JavaScript errors
```

2. **Verify API is accessible:**
```bash
curl https://your-domain.com/api/v1/status
# Should return 200 OK
```

3. **Check Next.js logs:**
```bash
pm2 logs scheduleright-web --lines 50
```

4. **Verify environment variables:**
```bash
cd /opt/scheduleright/apps/web
cat .env.local
# Should have NEXT_PUBLIC_API_URL
```

5. **Rebuild and restart:**
```bash
cd /opt/scheduleright/apps/web
pnpm build
pm2 restart scheduleright-web
```

---

### Problem: API calls fail from browser

**Symptoms:**
- CORS errors in console
- Network errors
- 401/403 errors

**Solutions:**

1. **Check CORS configuration:**
```env
# In apps/server/.env:
CORS_ORIGIN=https://your-domain.com,https://www.your-domain.com
```

2. **Verify cookies are sent:**
```
F12 → Network → Request Headers
Should include: Cookie: accessToken=...
```

3. **Check authentication:**
```javascript
// In browser console:
document.cookie
// Should see accessToken
```

4. **Clear browser cache:**
```
Ctrl+Shift+Delete → Clear cookies and cache
```

---

## Deployment Problems

### Problem: Deployment script fails

**Symptoms:**
- `deploy.sh` exits with error
- Build or restart fails
- Health check fails

**Solutions:**

1. **Run deploy steps manually:**
```bash
cd /opt/scheduleright

# 1. Pull code
git pull origin main

# 2. Install
pnpm install

# 3. Build
pnpm build

# 4. Restart
pm2 reload all

# 5. Check health
curl http://localhost:5710/health
```

2. **Check for git conflicts:**
```bash
git status
# If conflicts exist:
git stash
git pull origin main
```

3. **Verify permissions:**
```bash
ls -la /opt/scheduleright
# Should be owned by deployment user
```

---

### Problem: nginx not proxying correctly

**Symptoms:**
- 502 Bad Gateway
- nginx errors
- Can't reach API

**Solutions:**

1. **Check nginx status:**
```bash
sudo systemctl status nginx
sudo nginx -t  # Test configuration
```

2. **Verify upstream servers:**
```bash
# Check if backend is running
curl http://localhost:5710/health

# Check if frontend is running
curl http://localhost:5711
```

3. **Check nginx logs:**
```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

4. **Restart nginx:**
```bash
sudo systemctl restart nginx
```

---

## Logging & Debugging

### Enable Debug Logging

```env
# In .env:
LOG_LEVEL=debug  # Options: trace, debug, info, warn, error, fatal
```

```bash
pm2 restart scheduleright-server
pm2 logs scheduleright-server
```

### View Structured Logs

```bash
# Pretty-print JSON logs
pm2 logs scheduleright-server | jq

# Filter by log level
pm2 logs scheduleright-server | grep '"level":"error"'

# Filter by request ID
pm2 logs scheduleright-server | grep 'requestId":"<uuid>"'
```

### Check Audit Logs

```bash
curl http://admin:password@localhost:5713/scheduleright/_find \
  -H "Content-Type: application/json" \
  -d '{
    "selector": {
      "type": "audit",
      "action": "user.login"
    },
    "sort": [{"timestamp": "desc"}],
    "limit": 10
  }'
```

### Monitor Metrics

```bash
# Get all metrics
curl http://localhost:5710/metrics | jq

# Get summary (top 10 endpoints)
curl http://localhost:5710/metrics | jq '.summary'

# Get specific endpoint
curl http://localhost:5710/metrics | jq '.endpoints["/api/v1/bookings"]'
```

---

## Quick Fixes

### Reset Everything (Development Only)

```bash
# Stop services
pm2 stop all

# Reset database
curl -X DELETE http://admin:password@localhost:5713/scheduleright
curl -X PUT http://admin:password@localhost:5713/scheduleright

# Recreate indexes
cd /opt/scheduleright/apps/server
npm run db:indexes

# Seed data
npm run seed

# Rebuild
cd /opt/scheduleright
pnpm build

# Restart
pm2 restart all
```

### View All Logs at Once

```bash
# Real-time all logs
pm2 logs

# Last 100 lines all services
pm2 logs --lines 100

# Only errors
pm2 logs --err
```

### Quick Health Check

```bash
# Check all services
pm2 status

# Check health endpoint
curl http://localhost:5710/health

# Check readiness
curl http://localhost:5710/readiness | jq
```

---

## Getting Help

### Collect Diagnostic Information

```bash
#!/bin/bash
# diagnostic.sh - Collect system information

echo "=== System Info ==="
uname -a
free -h
df -h

echo "=== Node.js & PM2 ==="
node --version
pnpm --version
pm2 --version

echo "=== PM2 Status ==="
pm2 status

echo "=== Service Logs (last 50 lines) ==="
pm2 logs --lines 50 --nostream

echo "=== Database Status ==="
curl http://localhost:5713

echo "=== Health Check ==="
curl http://localhost:5710/health
curl http://localhost:5710/readiness

echo "=== Recent Errors ==="
pm2 logs --err --lines 20 --nostream
```

### Report Issues

When reporting issues, include:
1. Error message (exact text)
2. Steps to reproduce
3. Output of diagnostic script above
4. Relevant log excerpts
5. Environment (OS, Node version, etc.)

---

## Support Resources

- **GitHub Issues:** https://github.com/jamesk9526/scheduleright---NonProfit-Sheduling-Software/issues
- **Documentation:** All `.md` files in repository root
- **Logs Location:** `/var/log/scheduleright/` (PM2) and console logs via `pm2 logs`
