# ScheduleRight - Getting Started Guide

## Quick Start (UI Only)

No database needed to see the UI:

```bash
# Install dependencies (one time)
pnpm install

# Start all dev servers
pnpm dev

# Open browser
http://localhost:3000
```

You'll see the login page! (Won't be able to log in without a database yet)

---

## Full Setup with Database

### Prerequisites

- **Docker & Docker Compose** installed on your system
  - [Docker Desktop](https://www.docker.com/products/docker-desktop) (includes Docker Compose)

### Step 1: Start CouchDB

```bash
# From project root
docker-compose up -d

# Verify it's running
docker-compose ps

# You should see:
# - scheduleright-couchdb is healthy ✓
# - scheduleright-redis is running ✓
```

**CouchDB Dashboard** (optional): http://localhost:5984/_utils

### Step 2: Start Development Servers

```bash
# In a new terminal, from project root
pnpm dev

# Wait for all servers to start
# You should see:
# ✓ web ready in 2.5s (port 3000)
# ✓ admin ready in 2.5s (port 3002)
# ✓ embed ready in 2.5s (port 3003)
# ✓ server ready (port 3001)
```

### Step 3: Seed Test Data

```bash
# In another terminal
pnpm --filter=@scheduleright/server seed

# Output should show:
# 🌱 Starting database seed...
# ✅ Seeding complete
```

This creates:
- **1 Organization**: Test Community Center
- **4 Users**:
  - Admin: `admin@example.com` / `admin123`
  - Staff: `staff@example.com` / `staff123`
  - Volunteer: `volunteer@example.com` / `volunteer123`
  - Client: `client@example.com` / `client123`
- **1 Site**: Main Campus

### Step 4: Test Login

Visit **http://localhost:3000** and log in with:
```
Email: admin@example.com
Password: admin123
```

You should be redirected to the dashboard! 🎉

---

## 🔍 API Status & Health Check

### Check API Health

Visit **http://localhost:3001/health** to see:
- API status
- Database connection
- Environment info
- Service uptime

### View Detailed Status

Visit **http://localhost:3001/status** for:
- All available services
- Database info
- CORS configuration
- Quick links to endpoints

### Test API Connection (from login page)

The login page has a built-in "Test API Connection" button that will:
- Check if the server is running
- Verify database connectivity
- Show detailed error messages

---

## 📱 Available Apps

| App | URL | Purpose |
|-----|-----|---------|
| **Web App** | http://localhost:3000 | Client-facing scheduling UI |
| **Admin App** | http://localhost:3002 | Admin dashboard (in progress) |
| **Embed App** | http://localhost:3003 | Embeddable widget (in progress) |
| **API Server** | http://localhost:3001 | Backend REST API |

---

## 🚀 Running Commands

### Development

```bash
# Run all dev servers (watch mode)
pnpm dev

# Run specific app
pnpm --filter=@scheduleright/web dev
pnpm --filter=@scheduleright/server dev
```

### Testing

```bash
# Run all tests
pnpm test

# Run server tests only
pnpm --filter=@scheduleright/server test

# Run tests in watch mode
pnpm --filter=@scheduleright/server test:watch
```

### Type Checking

```bash
# Check TypeScript for errors
pnpm --filter=@scheduleright/server type-check
```

### Database

```bash
# Seed test data
pnpm --filter=@scheduleright/server seed

# View CouchDB admin console
open http://localhost:5984/_utils
```

### Docker

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f couchdb

# Remove all data (start fresh)
docker-compose down -v
```

---

## 🔧 Troubleshooting

### "Failed to fetch" on login

**Solution**: Make sure:
1. Dev servers are running: `pnpm dev`
2. Server is on port 3001
3. CouchDB is running: `docker-compose ps`
4. Try the "Test API Connection" button on login page

### CouchDB connection error

```bash
# Check if container is running
docker-compose ps

# View logs
docker-compose logs couchdb

# Restart
docker-compose restart couchdb
```

### Port already in use

```bash
# Find what's using port 3001 (macOS/Linux)
lsof -i :3001

# Find what's using port 3001 (Windows)
netstat -ano | findstr :3001

# Kill the process or change port in .env
```

### Database says "disconnected"

1. Check CouchDB is running: `docker-compose ps`
2. Restart it: `docker-compose restart couchdb`
3. Wait 10 seconds for health check to pass
4. Refresh the page or test API connection

---

## 📚 API Endpoints

### Authentication

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/v1/auth/login` | POST | ❌ | Login with email/password |
| `/api/v1/auth/refresh` | POST | ❌ | Refresh access token |
| `/api/v1/auth/logout` | POST | ✅ | Logout (clear cookies) |
| `/api/v1/users/me` | GET | ✅ | Get current user info |

### Organizations

| Endpoint | Method | Auth | Role | Description |
|----------|--------|------|------|-------------|
| `/api/v1/orgs` | GET | ✅ | ADMIN | List all organizations |
| `/api/v1/orgs/:orgId` | GET | ✅ | Member | Get org details |
| `/api/v1/orgs` | POST | ✅ | ADMIN | Create organization |

### Sites

| Endpoint | Method | Auth | Role | Description |
|----------|--------|------|------|-------------|
| `/api/v1/orgs/:orgId/sites` | GET | ✅ | Member | List sites |
| `/api/v1/orgs/:orgId/sites` | POST | ✅ | STAFF+ | Create site |

### Health & Status

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | JSON API health status |
| `/status` | GET | HTML status dashboard |

---

## 🏗️ Project Structure

```
apps/
├── web/              # Next.js web app (client)
│   ├── app/
│   │   ├── (auth)/   # Login page
│   │   ├── (dashboard)/ # Protected pages
│   │   └── ...
│   └── package.json
│
├── admin/            # Next.js admin app
├── embed/            # Next.js embed widget
│
└── server/           # Fastify API server
    ├── src/
    │   ├── routes/   # API endpoints
    │   ├── services/ # Business logic
    │   ├── middleware/ # Auth, RBAC
    │   └── ...
    └── package.json
```

---

## 🔐 Security Notes

### Development Defaults

⚠️ **DO NOT USE IN PRODUCTION:**

- JWT Secret: `your-secret-key-change-in-production`
- Database Password: `changeme`
- CORS Origin: `localhost:3000`

### Before Production

✅ Must do:
1. Set strong JWT secret in `.env`
2. Change database password
3. Set proper CORS origins
4. Enable HTTPS
5. Configure environment variables
6. Add rate limiting
7. Set up monitoring/logging
8. Run security audit

---

## 📖 Documentation

- **Auth Implementation**: [AUTH_IMPLEMENTATION.md](AUTH_IMPLEMENTATION.md)
- **Org/Site Implementation**: [ORG_SITE_IMPLEMENTATION.md](ORG_SITE_IMPLEMENTATION.md)
- **Testing Guide**: [ORG_SITE_TESTING.md](ORG_SITE_TESTING.md)
- **API Contracts**: [API_CONTRACTS.md](API_CONTRACTS.md)

---

## ❓ Need Help?

1. **Check the status page**: http://localhost:3001/status
2. **Test API**: Click "Test API Connection" on login page
3. **View logs**: `docker-compose logs -f`
4. **Check browser console**: F12 → Console tab
5. **Review error messages**: They're designed to be helpful!

---

## ✅ Checklist for Full Setup

- [ ] Docker Desktop installed
- [ ] `pnpm install` completed
- [ ] `docker-compose up -d` running
- [ ] `pnpm dev` started
- [ ] `pnpm --filter=@scheduleright/server seed` completed
- [ ] Can see login page at http://localhost:3000
- [ ] Can click "Test API Connection" and see success
- [ ] Can log in with admin@example.com / admin123
- [ ] Dashboard loads after login

**Everything working?** You're ready to start building! 🚀
