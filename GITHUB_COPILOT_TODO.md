to API
- [x] Add reminders API + settings UI wiring (Twilio send still pending)

### 1) Admin Bootstrap (First-Run Setup)
- [x] Add `system:bootstrap` document and enforce initialization lock
- [x] Create `POST /api/v1/bootstrap` to create org + admin user
- [x] Block all other routes until bootstrap completes

### 2) Auto DB Setup (Defaults + Indexes)
- [x] Create DB if missing on startup (CouchDB + MySQL)
- [x] Create indexes on startup (CouchDB)
- [x] Create `system:config` defaults

### 3) MySQL Support (Preferred)# ScheduleRight - GitHub Copilot TODO List

**Last Updated:** January 16, 2026  
**Project Status:** Core features complete; pending bootstrap + MySQL support + production hardening  
**Current Focus:** UI feature sprint (volunteers + reminders), admin bootstrap, auto DB config

---

## 🚧 CURRENT NEXT STEPS (NEW)

### 0) UI Feature Sprint (Client Scheduling + Volunteers + SMS)
- [x] Replace dashboard “Coming Soon” list with live shortcuts
- [x] Add Volunteers dashboard page with empty state
- [x] Add Volunteer Shifts page (calendar placeholder)
- [x] Add SMS Reminders settings page (UI-only)
- [x] Add volunteers + shifts API endpoints
- [x] Wire volunteer list + shift data 
- [x] Add `DB_PROVIDER` config (`couchdb | mysql`)
- [x] Introduce repository interface and implement MySQL store (documents table bridge)
- [x] Add versioned MySQL migrations and expanded schema (documents indexes + users/org indexes + volunteers/shifts tables)

### 4) Production Hardening
- [ ] Remove auth debug logging
- [ ] Lock metrics endpoint
- [ ] Verify backups + DR runbook

See [INSTRUCTIONS_NEXT_STEPS.md](INSTRUCTIONS_NEXT_STEPS.md) for full details.

## UI Usability Pass (Iterative)
- [x] UX polish for Field Library (filter clarity, empty states, help text)
- [x] UX polish for Client custom fields (labels, spacing, save feedback)
- [x] UX polish for Volunteer custom fields (selection clarity, save feedback)
- [x] UX polish for Site custom fields (selection clarity, save feedback)
- [x] UX polish for Organization custom fields (helper text, required/admin indicators, save feedback)
- [x] UX polish for Programs/Resources custom fields (entity selector clarity, save feedback)
- [ ] Auditing & permissions
   - [x] Log changes to property definitions + values
   - [x] Enforce visibility (public vs staff vs admin)
- [ ] Login page branding polish (pull org branding, apply colors/logo, branded gradients)
- [x] Help Desk / searchable guide
   - [x] Searchable `/help` page with indexed URLs to docs/tools, API endpoints, embed guide, properties/branding/messaging
   - [x] Context cards with deep links: API base, embed token docs, branding settings, login branding orgId parameter, properties routes
   - [x] Surface quick actions in dashboard header and login footer; optional keyboard shortcut (`?` or `Ctrl+K`) opening a command palette backed by the same index
   - [x] Add tests or e2e smoke for branding/help

## ✅ COMPLETED TODOS (Core Feature Set)

### ✅ Todo #1: Auth System with JWT
**Status:** ✅ COMPLETE  
**Completion Date:** January 2026

**What Was Built:**
- JWT token generation and validation
- Email/password authentication with bcrypt
- Refresh token rotation with HttpOnly cookies
- RBAC role checking middleware
- Test data seeding script

**Files Created:**
- `apps/server/src/services/auth.service.ts` (315 lines)
- `apps/server/src/routes/auth.ts` (158 lines)
- `apps/server/src/middleware/auth.ts` (95 lines)
- `apps/server/src/scripts/seed.ts` (280 lines)

**Endpoints:**
- POST `/api/v1/auth/login` - Login with email/password
- POST `/api/v1/auth/refresh` - Refresh access token

---

### ✅ Todo #2: Organization & Site Endpoints
**Status:** ✅ COMPLETE  
**Completion Date:** January 2026

**What Was Built:**
- Organization CRUD with admin-only creation
- Multi-site support per organization
- Site configuration and management
- RBAC protection (ADMIN, STAFF roles)

**Files Created:**
- `apps/server/src/services/org.service.ts` (385 lines)
- `apps/server/src/routes/orgs.ts` (245 lines)
- `apps/server/src/routes/sites.ts` (198 lines)

**Endpoints:**
- POST `/api/v1/orgs` - Create organization (ADMIN only)
- GET `/api/v1/orgs` - List user's organizations
- GET `/api/v1/orgs/:orgId` - Get organization details
- POST `/api/v1/orgs/:orgId/sites` - Create site (STAFF+)
- GET `/api/v1/sites` - List all sites
- GET `/api/v1/sites/:siteId` - Get site details

---

### ✅ Todo #3: Web Login UI
**Status:** ✅ COMPLETE  
**Completion Date:** January 2026

**What Was Built:**
- Login page with form validation
- Error display with user feedback
- Auto-redirect to dashboard on success
- Token storage and auth context
- Loading states and UX polish

**Files Created:**
- `apps/web/app/(auth)/login/page.tsx` (145 lines)
- `apps/web/lib/hooks/useApi.ts` (78 lines)
- TanStack Query integration

**Features:**
- Email/password validation (Zod)
- Error message display
- Remember me functionality
- Responsive design

---

### ✅ Todo #4: Dashboard with Profile & Orgs
**Status:** ✅ COMPLETE  
**Completion Date:** January 2026

**What Was Built:**
- Main dashboard with welcome message
- User profile page with editable fields
- Organizations list and management
- Site creation and viewing
- Role-based UI visibility

**Files Created:**
- `apps/web/app/(dashboard)/dashboard/page.tsx` (85 lines)
- `apps/web/app/(dashboard)/profile/page.tsx` (142 lines)
- `apps/web/app/(dashboard)/orgs/page.tsx` (156 lines)
- `apps/web/app/(dashboard)/orgs/new/page.tsx` (178 lines)
- `apps/web/app/(dashboard)/orgs/[orgId]/page.tsx` (245 lines)
- `apps/web/lib/hooks/useData.ts` (125 lines)

**Features:**
- TanStack Query data caching
- Optimistic updates
- Loading skeletons
- Error boundaries

---

### ✅ Todo #5: Health/Status Endpoints
**Status:** ✅ COMPLETE  
**Completion Date:** January 2026

**What Was Built:**
- Basic health check endpoint
- Detailed HTML status page with diagnostics
- Service status tracking
- Database connection monitoring

**Files Modified:**
- `apps/server/src/index.ts` - Added `/health` and `/status` endpoints

**Endpoints:**
- GET `/health` - Returns `{ status: "ok" }`
- GET `/status` - HTML page with service details

---

### ✅ Todo #6: Docker Compose Setup
**Status:** ✅ COMPLETE  
**Completion Date:** January 2026

**What Was Built:**
- CouchDB 3.3 container configuration
- Persistent volume storage
- Port mapping (5984 → 5985)
- Environment variables setup

**Files Created:**
- `docker-compose.yml` (45 lines)
- `.env.example` with CouchDB credentials

**Commands:**
```bash
pnpm run docker:up    # Start services
pnpm run docker:down  # Stop services
```

---

### ✅ Todo #7: Availability/Booking Endpoints
**Status:** ✅ COMPLETE  
**Completion Date:** January 2026

**What Was Built:**
- Availability slot management with recurrence patterns
- Booking lifecycle management (pending → confirmed/completed/cancelled/no-show)
- Capacity tracking and conflict detection
- RBAC enforcement for all operations
- Public booking (no auth required for creation)

**Files Created:**
- `apps/server/src/services/availability.service.ts` (315 lines)
- `apps/server/src/services/booking.service.ts` (345 lines)
- `apps/server/src/routes/availability.ts` (215 lines)
- `apps/server/src/routes/booking.ts` (385 lines)
- `BOOKING_API_GUIDE.md` (comprehensive documentation)
- `test-booking-api.ps1` (automated testing script)

**Endpoints (14 total):**

**Availability (5 endpoints):**
- POST `/api/v1/sites/:siteId/availability` - Create availability slot
- GET `/api/v1/sites/:siteId/availability` - List all slots
- GET `/api/v1/availability/:slotId` - Get single slot
- GET `/api/v1/sites/:siteId/availability/available` - Get available slots only
- PUT `/api/v1/availability/:slotId/deactivate` - Deactivate slot (soft delete)

**Booking (9 endpoints):**
- POST `/api/v1/sites/:siteId/bookings` - Create booking (public)
- GET `/api/v1/sites/:siteId/bookings` - List site bookings (STAFF+)
- GET `/api/v1/bookings/me` - List my bookings (authenticated)
- GET `/api/v1/bookings/:bookingId` - Get booking details
- PUT `/api/v1/bookings/:bookingId/confirm` - Confirm booking (STAFF+)
- PUT `/api/v1/bookings/:bookingId/cancel` - Cancel booking (owner or STAFF+)
- PUT `/api/v1/bookings/:bookingId/complete` - Mark completed (STAFF+)
- PUT `/api/v1/bookings/:bookingId/no-show` - Mark no-show (STAFF+)
- PUT `/api/v1/bookings/:bookingId/notes` - Update staff notes (STAFF+)

**Features:**
- ✓ Recurring patterns (daily, weekly, monthly, once)
- ✓ Capacity management (currentBookings vs maxCapacity)
- ✓ Conflict detection
- ✓ Soft deletes with audit trail
- ✓ Zod validation
- ✓ Type-safe handlers

---

### ✅ Todo #8: Integration & E2E Tests
**Status:** ✅ COMPLETE  
**Completion Date:** January 2026

**What Was Built:**
- Comprehensive test suite (~2,300 lines across 6 files)
- 110+ test cases covering all scenarios
- Mock database for isolated testing
- E2E tests for all API endpoints
- RBAC permission validation
- Error scenario handling

**Files Created:**
- `apps/server/src/__tests__/availability-booking.integration.test.ts` (600 lines)
- `apps/server/src/__tests__/availability-booking.e2e.test.ts` (400 lines)
- `apps/server/src/__tests__/rbac.test.ts` (500 lines)
- `apps/server/src/__tests__/error-scenarios.test.ts` (600 lines)
- `apps/server/src/__tests__/test-utils.ts` (300 lines)
- `apps/server/src/__tests__/setup.ts` (80 lines)

**Test Coverage:**
- ✓ Service layer integration tests
- ✓ HTTP endpoint E2E tests
- ✓ RBAC enforcement (ADMIN, STAFF, CLIENT)
- ✓ Validation errors (400)
- ✓ Authentication/Authorization (401/403)
- ✓ Resource not found (404)
- ✓ Conflict handling (409)
- ✓ Edge cases and race conditions

**Commands:**
```bash
npm run test --workspace=apps/server
npm run test:watch --workspace=apps/server
```

---

### ✅ Todo #9: Web UI for Bookings
**Status:** ✅ COMPLETE  
**Completion Date:** January 16, 2026

**What Was Built:**
- Complete booking UI with 6 pages (~2,000+ lines)
- Client booking flow (browse, create, view)
- Staff management interface (search, filter, CRUD)
- Status filtering and search functionality
- Modal dialogs for confirmations
- Responsive design with Tailwind CSS

**Files Created:**
- `apps/web/app/(dashboard)/bookings/page.tsx` (130 lines) - Main hub
- `apps/web/app/(dashboard)/bookings/browse/page.tsx` (380 lines) - Browse & book
- `apps/web/app/(dashboard)/bookings/new/page.tsx` (320 lines) - Create form
- `apps/web/app/(dashboard)/bookings/my/page.tsx` (260 lines) - My bookings
- `apps/web/app/(dashboard)/bookings/manage/page.tsx` (420 lines) - Staff management
- `apps/web/app/(dashboard)/bookings/[bookingId]/page.tsx` (220 lines) - Details
- `TODO_9_BOOKING_UI_PLAN.md` (implementation plan)

**Pages Built:**

1. **Main Bookings Page** - Dashboard with stats (upcoming, completed, cancelled)
2. **Browse Availability** - Search slots by site/date, inline booking modal
3. **Create Booking** - Step-by-step form (select location → slot → client info)
4. **My Bookings** - View/cancel own bookings, status filtering
5. **Manage Bookings** - Staff page with search, filter, CRUD actions
6. **Booking Details** - Full booking info with timeline

**Features:**
- ✓ Role-based access (staff-only manage page)
- ✓ Status filtering (all, pending, confirmed, completed, cancelled)
- ✓ Search by name, email, phone
- ✓ Color-coded status badges
- ✓ Confirmation dialogs for actions
- ✓ Form validation with Zod
- ✓ TanStack Query integration
- ✓ Responsive grid/table layouts
- ✓ Loading states
- ✓ Error handling

---

## 🚧 REMAINING TODOS (3/12)

### ⏳ Todo #10: Multi-tenancy & Production Polish
**Priority:** 🔴 HIGH  
**Estimated Effort:** 3-4 hours  
**Status:** NOT STARTED

#### **Objective:**
Prepare application for production deployment with proper multi-tenant isolation, configuration, and deployment readiness.

#### **Scope:**

**A. Multi-tenant Enhancements**
1. **Subdomain Routing** (Optional)
   - Configure organization-specific subdomains
   - Example: `org1.scheduleright.com`, `org2.scheduleright.com`
   - Update routing logic to detect and route by subdomain
   - Files to create/modify:
     - `apps/web/middleware.ts` - Subdomain detection
     - `apps/server/src/middleware/tenant.ts` - Tenant context

2. **Organization Branding**
   - Add branding fields to organization schema:
     - Logo URL
     - Primary color
     - Secondary color
     - Custom domain (optional)
   - Update organization service and UI
   - Files to modify:
     - `packages/schema/src/organization.ts` - Add branding fields
     - `apps/server/src/services/org.service.ts` - Handle branding
     - `apps/web/app/(dashboard)/orgs/[orgId]/page.tsx` - Branding UI

3. **Data Isolation Enforcement**
   - Audit all queries to ensure org-level filtering
   - Add database views/indexes for tenant isolation
   - Test cross-tenant access prevention
   - Files to review:
     - All service files (`*.service.ts`)
     - All route handlers (`routes/*.ts`)

**B. Configuration Management**
1. **Environment Variables**
   - Document all required environment variables
   - Create `.env.example` with all vars
   - Add validation on startup (check required vars)
   - Files to create/modify:
     - `apps/server/.env.example`
     - `apps/web/.env.example`
     - `apps/server/src/config.ts` - Config validation

2. **Per-Organization Settings**
   - Booking time slots (15/30/60 min increments)
   - Timezone configuration
   - Notification preferences
   - Cancellation policies
   - Files to modify:
     - `packages/schema/src/organization.ts` - Add settings
     - `apps/server/src/services/org.service.ts` - Settings CRUD
     - Create UI for settings management

**C. Production Deployment Prep**
1. **Build & Deploy Scripts**
   - Create production build scripts
   - Docker production images (multi-stage)
   - Deployment automation (optional: GitHub Actions)
   - Files to create:
     - `Dockerfile` (web, server)
     - `.github/workflows/deploy.yml` (optional)
     - `deploy.sh` or `deploy.ps1`

2. **Health Checks & Monitoring**
   - Enhance `/health` endpoint with detailed checks
   - Add `/readiness` endpoint for K8s/load balancers
   - Database connection health
   - Memory/CPU metrics
   - Files to modify:
     - `apps/server/src/index.ts` - Enhanced health checks
     - Create `apps/server/src/health.ts` service

3. **Security Hardening**
   - CORS configuration (production domains)
   - Rate limiting (express-rate-limit or fastify-rate-limit)
   - Helmet.js security headers
   - HTTPS enforcement
   - Files to create/modify:
     - `apps/server/src/middleware/security.ts`
     - `apps/server/src/middleware/rate-limit.ts`

**D. Database Optimization**
1. **Indexes**
   - Create indexes for common queries:
     - `org.id` + `type`
     - `booking.siteId` + `booking.status`
     - `availability.siteId` + `availability.startTime`
   - Files to create:
     - `apps/server/src/db/indexes.ts` - Index creation script

2. **Database Views**
   - Create CouchDB design documents
   - Views for reporting (bookings by status, site, date)
   - Files to create:
     - `apps/server/src/db/views.ts`

#### **GitHub Copilot Instructions:**

**PROMPT 1: Organization Branding Fields**
```
Add organization branding fields to the schema and service:
1. Update packages/schema/src/organization.ts to add:
   - logoUrl (optional string)
   - primaryColor (optional string, hex color)
   - secondaryColor (optional string, hex color)
   - customDomain (optional string)
2. Update apps/server/src/services/org.service.ts:
   - Handle branding fields in create/update
   - Validate color format (hex)
3. Create UI in apps/web/app/(dashboard)/orgs/[orgId]/settings/page.tsx:
   - Form to edit branding
   - Color picker inputs
   - Logo upload (or URL input)
   - Preview of branding
Use Zod for validation, Tailwind for styling, TanStack Query for data fetching.
```

**PROMPT 2: Environment Configuration**
```
Create comprehensive environment configuration:
1. apps/server/src/config.ts:
   - Define ConfigSchema with Zod
   - Validate required environment variables on startup
   - Export typed config object
   - Include: DATABASE_URL, JWT_SECRET, PORT, NODE_ENV, CORS_ORIGIN
2. apps/server/.env.example:
   - Document all required variables with descriptions
   - Include examples and defaults
3. Modify apps/server/src/index.ts:
   - Import and validate config at startup
   - Exit with error if validation fails
   - Log config (without secrets) on startup
```

**PROMPT 3: Production Health Checks**
```
Enhance health check endpoints for production:
1. Create apps/server/src/services/health.ts:
   - checkDatabase(): Test CouchDB connection
   - checkMemory(): Get process memory usage
   - checkUptime(): Get process uptime
   - checkDisk(): Optional disk space check
2. Modify apps/server/src/index.ts:
   - GET /health: Basic health (200 OK)
   - GET /readiness: Detailed health checks with status codes
   - Return JSON with all health metrics
   - If any check fails, return 503 Service Unavailable
3. Add error handling and timeout for health checks
```

**PROMPT 4: Security Middleware**
```
Implement production security middleware:
1. Create apps/server/src/middleware/security.ts:
   - CORS with configurable origins from env
   - Security headers (use helmet for Express-like headers)
   - HTTPS enforcement (redirect http to https in production)
2. Create apps/server/src/middleware/rate-limit.ts:
   - Rate limiting per IP (e.g., 100 requests per 15 minutes)
   - Different limits for auth endpoints (stricter)
   - Return 429 Too Many Requests
3. Register middleware in apps/server/src/index.ts before routes
```

**PROMPT 5: Database Indexes & Views**
```
Optimize database with indexes and views:
1. Create apps/server/src/db/indexes.ts:
   - createIndexes() function that creates CouchDB indexes
   - Indexes for:
     - Organizations: type, name
     - Sites: orgId, type
     - Bookings: siteId + status, clientEmail, createdAt
     - Availability: siteId + status, startTime
2. Create apps/server/src/db/views.ts:
   - Design documents for reporting views:
     - bookings_by_status
     - bookings_by_site
     - bookings_by_date
3. Call createIndexes() on server startup
4. Add npm script: "db:indexes": "tsx src/db/indexes.ts"
```

#### **Testing Checklist:**
- [ ] Organization branding displays correctly
- [ ] Environment validation catches missing variables
- [ ] Health checks return correct status
- [ ] Rate limiting blocks excessive requests
- [ ] CORS only allows configured origins
- [ ] Database indexes improve query performance
- [ ] Cross-tenant data isolation is enforced
- [ ] All queries filter by organization ID

#### **Success Criteria:**
✅ Organization branding fields working  
✅ Environment configuration validated  
✅ Production health checks responding  
✅ Security middleware active (CORS, rate limit, headers)  
✅ Database indexes created  
✅ Multi-tenant isolation verified  
✅ Ready for production deployment

---

### ⏳ Todo #11: Monitoring & Observability
**Priority:** 🟡 MEDIUM  
**Estimated Effort:** 2-3 hours  
**Status:** NOT STARTED

#### **Objective:**
Implement comprehensive monitoring, logging, and observability for production operations.

#### **Scope:**

**A. Structured Logging**
1. **Logging Library Setup**
   - Use Pino (already installed) for structured logging
   - Configure log levels (debug, info, warn, error)
   - Add request IDs for tracing
   - Files to create/modify:
     - `apps/server/src/lib/logger.ts` - Logger configuration
     - `apps/server/src/middleware/request-logger.ts` - HTTP request logging

2. **Log Correlation**
   - Add request ID to all logs
   - Include user ID and org ID in log context
   - Structured log format (JSON in production)

**B. Error Tracking**
1. **Error Handler**
   - Centralized error handling middleware
   - Log all errors with stack traces
   - Sanitize errors before sending to client
   - Files to create:
     - `apps/server/src/middleware/error-handler.ts`

2. **Error Reporting (Optional)**
   - Integrate with Sentry or similar (if desired)
   - Capture unhandled exceptions
   - Send error notifications

**C. Performance Monitoring**
1. **Request Timing**
   - Measure endpoint response times
   - Log slow queries (>1s)
   - Track database query performance

2. **Metrics Collection**
   - HTTP request count
   - Response time percentiles (p50, p95, p99)
   - Error rate
   - Active bookings count
   - Files to create:
     - `apps/server/src/lib/metrics.ts`

**D. Audit Logging**
1. **Audit Trail**
   - Log all data-changing operations:
     - User login/logout
     - Organization/site changes
     - Booking status changes
     - RBAC permission checks
   - Files to create:
     - `apps/server/src/services/audit.service.ts`

2. **Audit Log Storage**
   - Store audit logs in separate CouchDB database
   - Immutable audit records
   - Retention policy (e.g., 90 days)

#### **GitHub Copilot Instructions:**

**PROMPT 1: Structured Logging Setup**
```
Set up structured logging with Pino:
1. Create apps/server/src/lib/logger.ts:
   - Configure Pino with pretty print in dev, JSON in production
   - Export logger instance
   - Include timestamp, pid, hostname
2. Create apps/server/src/middleware/request-logger.ts:
   - Generate unique request ID (uuid)
   - Log incoming requests with method, path, user-agent
   - Log response with status code, duration
   - Attach request ID to all subsequent logs
3. Modify apps/server/src/index.ts:
   - Import logger
   - Use request logger middleware
   - Replace console.log with logger.info/error
```

**PROMPT 2: Centralized Error Handler**
```
Create centralized error handling:
1. apps/server/src/middleware/error-handler.ts:
   - Catch all errors thrown in routes
   - Log error with stack trace
   - Map error types to HTTP status codes:
     - ValidationError → 400
     - UnauthorizedError → 401
     - ForbiddenError → 403
     - NotFoundError → 404
     - ConflictError → 409
     - Default → 500
   - Send sanitized error to client (no stack in production)
2. Create custom error classes in apps/server/src/lib/errors.ts:
   - ValidationError, UnauthorizedError, ForbiddenError, NotFoundError, ConflictError
3. Register error handler as last middleware in apps/server/src/index.ts
```

**PROMPT 3: Performance Metrics**
```
Add performance monitoring:
1. Create apps/server/src/lib/metrics.ts:
   - Track request count by endpoint
   - Track response times (use performance.now())
   - Calculate percentiles (p50, p95, p99)
   - Export getMetrics() function
2. Create apps/server/src/middleware/metrics.ts:
   - Record start time at request start
   - Record end time at response finish
   - Calculate duration
   - Increment request counter
   - Log slow requests (>1000ms)
3. Add GET /metrics endpoint in apps/server/src/index.ts:
   - Return metrics as JSON
   - Include uptime, memory usage, request stats
```

**PROMPT 4: Audit Logging Service**
```
Implement audit trail:
1. Create apps/server/src/services/audit.service.ts:
   - createAuditLog(action, userId, orgId, details): Create audit record
   - getAuditLogs(orgId, filters): Query audit logs
   - Audit log schema: timestamp, action, userId, orgId, resourceType, resourceId, details
2. Update service files to call createAuditLog:
   - apps/server/src/services/booking.service.ts: Log booking create, confirm, cancel, complete
   - apps/server/src/services/org.service.ts: Log org/site create, update, delete
   - apps/server/src/services/auth.service.ts: Log login attempts
3. Store audit logs in separate database: scheduleright_audit
```

#### **Testing Checklist:**
- [ ] Logs include request IDs
- [ ] Structured logs are JSON in production
- [ ] Error handler catches all errors
- [ ] Metrics endpoint returns data
- [ ] Slow queries are logged
- [ ] Audit logs created for important actions
- [ ] Audit logs are queryable

#### **Success Criteria:**
✅ Structured logging with Pino  
✅ Request IDs for correlation  
✅ Centralized error handling  
✅ Performance metrics collection  
✅ Audit trail for data changes  
✅ Metrics endpoint available  
✅ Production-ready observability

---

### ⏳ Todo #12: Admin Runbook & Documentation
**Priority:** 🟢 LOW  
**Estimated Effort:** 1-2 hours  
**Status:** NOT STARTED

#### **Objective:**
Create comprehensive operational documentation for administrators and DevOps teams.

#### **Scope:**

**A. Deployment Guide**
1. **Production Deployment**
   - VPS/server requirements (Ubuntu 22.04 LTS recommended)
   - Installation steps (Node.js, pnpm, CouchDB, nginx)
   - Build and deployment commands
   - Environment setup
   - Files to create:
     - `DEPLOYMENT.md` - Deployment guide
     - `deploy.sh` - Automated deployment script

2. **Docker Deployment**
   - Docker Compose for production
   - Volume management
   - Network configuration
   - Files to create:
     - `docker-compose.prod.yml`

**B. Troubleshooting Procedures**
1. **Common Issues**
   - Database connection failures
   - Authentication errors
   - Performance issues
   - Memory leaks
   - Files to create:
     - `TROUBLESHOOTING.md`

2. **Debugging Steps**
   - How to check logs
   - How to restart services
   - How to access database
   - How to check health endpoints

**C. Backup & Restore**
1. **Backup Procedures**
   - CouchDB backup (replication)
   - Database export commands
   - Backup schedule recommendations
   - Files to create:
     - `BACKUP.md`
     - `backup.sh` - Backup script

2. **Restore Procedures**
   - How to restore from backup
   - Disaster recovery steps
   - Testing backups

**D. Operational Checklists**
1. **Daily Operations**
   - Health check verification
   - Log review
   - Performance monitoring

2. **Weekly Operations**
   - Backup verification
   - Security updates
   - Database maintenance

3. **Monthly Operations**
   - Performance review
   - Capacity planning
   - User audit

**E. Contact & Escalation**
1. **Support Information**
   - Technical support contacts
   - Escalation procedures
   - On-call rotation (if applicable)

#### **GitHub Copilot Instructions:**

**PROMPT 1: Production Deployment Guide**
```
Create comprehensive deployment documentation:
1. DEPLOYMENT.md:
   - Server requirements (2GB RAM, 2 CPU, 20GB disk)
   - Ubuntu 22.04 LTS setup steps
   - Node.js 20.x installation
   - pnpm installation
   - CouchDB 3.3 installation
   - nginx setup as reverse proxy
   - SSL certificate with Let's Encrypt
   - Environment variable configuration
   - Build commands: pnpm install, pnpm build
   - PM2 or systemd service setup
   - Firewall rules (ufw)
2. deploy.sh script:
   - Pull latest code from git
   - Install dependencies
   - Build apps
   - Restart services
   - Run health checks
```

**PROMPT 2: Troubleshooting Guide**
```
Create troubleshooting documentation:
1. TROUBLESHOOTING.md with sections:
   - Database Connection Issues:
     - Check CouchDB status
     - Verify credentials
     - Test connectivity (curl)
   - Authentication Failures:
     - Check JWT secret configuration
     - Verify token expiration
     - Check user credentials
   - Performance Issues:
     - Check logs for slow queries
     - Review memory usage (htop)
     - Check database indexes
   - Server Won't Start:
     - Check environment variables
     - Verify port availability
     - Check logs for errors
2. Include commands for each troubleshooting step
3. Add "Quick Fixes" section for common issues
```

**PROMPT 3: Backup & Restore Procedures**
```
Create backup and restore documentation:
1. BACKUP.md:
   - CouchDB replication setup (continuous backup)
   - Manual backup: curl commands to export databases
   - Backup frequency recommendations (daily incremental, weekly full)
   - Backup storage (S3, local disk, offsite)
   - Backup retention policy (30 days)
2. backup.sh script:
   - Export all CouchDB databases
   - Create timestamped backup file
   - Upload to backup storage (optional)
   - Cleanup old backups
3. Restore procedures:
   - Stop services
   - Restore database from backup
   - Verify data integrity
   - Restart services
   - Test application
4. Include disaster recovery steps
```

**PROMPT 4: Operational Checklists**
```
Create operational runbook:
1. OPERATIONS.md with checklists:
   - Daily:
     - [ ] Check /health endpoint
     - [ ] Review error logs
     - [ ] Monitor active users
   - Weekly:
     - [ ] Verify backups completed
     - [ ] Apply security updates
     - [ ] Review performance metrics
     - [ ] Check disk space
   - Monthly:
     - [ ] Review audit logs
     - [ ] Performance analysis
     - [ ] Capacity planning
     - [ ] User access audit
2. Include commands for each task
3. Add escalation procedures for issues
```

#### **Files to Create:**
- `DEPLOYMENT.md` - Complete deployment guide
- `TROUBLESHOOTING.md` - Troubleshooting procedures
- `BACKUP.md` - Backup and restore guide
- `OPERATIONS.md` - Operational checklists
- `deploy.sh` or `deploy.ps1` - Deployment script
- `backup.sh` or `backup.ps1` - Backup script

#### **Success Criteria:**
✅ Deployment guide complete and tested  
✅ Troubleshooting guide covers common issues  
✅ Backup procedures documented  
✅ Operational checklists ready  
✅ Scripts tested and working  
✅ Documentation clear and actionable

---

## 📊 Overall Progress Summary

```
Completed:    ███████████████████░ 75% (9/12)
In Progress:  ░░░░░░░░░░░░░░░░░░░░  0% (0/12)
Not Started:  █████░░░░░░░░░░░░░░░ 25% (3/12)
```

## 🎯 Key Metrics (As of Jan 16, 2026)

- **Total API Endpoints:** 40+ (Auth, Org, Site, Availability, Booking, Health, Status)
- **Services:** 6 (Auth, Org, Availability, Booking, User, Audit)
- **Web Pages:** 12 (Login, Dashboard, Profile, Orgs x3, Bookings x6)
- **Lines of Code (Approx):** 15,000+ (backend + frontend + tests)
- **Test Coverage:** 110+ test cases, ~2,300 lines of tests
- **Documentation:** 10+ comprehensive markdown files

## 🚀 What's Production-Ready

✅ Complete authentication system (JWT, refresh tokens, RBAC)  
✅ Organization and multi-site management  
✅ Availability scheduling (recurring patterns)  
✅ Booking management (full lifecycle)  
✅ Complete web UI (login, dashboard, bookings)  
✅ Comprehensive test suite (integration, e2e, RBAC, errors)  
✅ API documentation and guides  
✅ Health monitoring endpoints  
✅ Docker deployment setup  

## 📅 Recommended Next Steps (Priority Order)

1. **🔴 Todo #10: Multi-tenancy & Production Polish** (3-4 hours)
   - Add organization branding
   - Environment configuration
   - Security hardening
   - Database optimization
   - **BLOCKER** for production deployment

2. **🟡 Todo #11: Monitoring & Observability** (2-3 hours)
   - Structured logging
   - Error tracking
   - Performance metrics
   - Audit logging
   - **IMPORTANT** for production operations

3. **🟢 Todo #12: Admin Runbook** (1-2 hours)
   - Deployment guide
   - Troubleshooting docs
   - Backup/restore procedures
   - Operational checklists
   - **NICE TO HAVE** for handoff to operations

## 💡 Quick Commands Reference

```bash
# Development
pnpm install                          # Install dependencies
pnpm dev                              # Start all services
pnpm --filter @scheduleright/web dev  # Start web only
pnpm --filter @scheduleright/server dev # Start server only

# Testing
pnpm test                             # Run all tests
pnpm --filter @scheduleright/server test # Run server tests only
pnpm test:watch                       # Watch mode

# Docker
pnpm run docker:up                    # Start CouchDB
pnpm run docker:down                  # Stop CouchDB

# Build
pnpm build                            # Build all apps
pnpm --filter @scheduleright/web build # Build web only

# Linting
pnpm lint                             # Lint all packages
pnpm format                           # Format code
```

## 📖 Documentation Index

- [README.md](./README.md) - Project overview and milestones
- [COPILOT_INSTRUCTIONS.md](./COPILOT_INSTRUCTIONS.md) - Development guidelines
- [PROGRESS_SUMMARY.md](./PROGRESS_SUMMARY.md) - Original progress tracking
- [STATUS.md](./STATUS.md) - Initial project status
- [BOOKING_API_GUIDE.md](./BOOKING_API_GUIDE.md) - API documentation with examples
- [TODO_7_COMPLETION.md](./TODO_7_COMPLETION.md) - Availability/booking implementation details
- [TODO_8_COMPLETION_REPORT.md](./TODO_8_COMPLETION_REPORT.md) - Test suite details
- [TODO_9_BOOKING_UI_PLAN.md](./TODO_9_BOOKING_UI_PLAN.md) - Booking UI implementation plan
- [DASHBOARD_FEATURES.md](./DASHBOARD_FEATURES.md) - Dashboard UI documentation
- [PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md) - Ubuntu/nginx deployment guide

---

## 🤖 Using This TODO List with GitHub Copilot

### How to Use These Instructions:

1. **Copy the entire PROMPT block** from the todo you want to work on
2. **Paste it into GitHub Copilot Chat** in VS Code
3. **Let Copilot generate the code** based on the detailed instructions
4. **Review and test** the generated code
5. **Iterate** if needed by asking follow-up questions

### Example Workflow:

1. Open GitHub Copilot Chat (Ctrl+Shift+I or Cmd+Shift+I)
2. Select Todo #10, copy PROMPT 1
3. Paste into chat: "Add organization branding fields to the schema..."
4. Copilot will generate the code for all 3 steps
5. Review the changes and test
6. Move to PROMPT 2, repeat process

### Tips for Best Results:

- **Be specific**: The prompts are detailed for a reason
- **One prompt at a time**: Complete and test each prompt before moving to the next
- **Review generated code**: Always review for correctness and style
- **Ask follow-ups**: If something isn't right, ask Copilot to refine it
- **Use inline chat**: For small edits, use inline chat (Ctrl+I or Cmd+I)
- **Test incrementally**: Test after each major change

### Common Follow-up Questions:

- "Add TypeScript types for the new fields"
- "Update the validation schema to include these fields"
- "Add a test case for this feature"
- "Make this responsive for mobile"
- "Add error handling for this function"

---

**Last Updated:** January 16, 2026  
**Next Review:** After completing Todo #10  
**Maintained by:** James K (@jamesk9526)
