# ScheduleRight — Next Steps & Production Readiness

**Last Updated:** January 16, 2026

This file captures the remaining work requested: **admin-first-run setup**, **auto database config**, and **MySQL support options**, plus a **production-readiness checklist**.

---

## 1) Admin First-Run Setup (Required)

**Goal:** On the very first start, force the user to create the initial admin account and organization before the rest of the API is usable.

### Design
- Add a **bootstrap state**: `bootstrapComplete: boolean` stored in DB (e.g., document `system:bootstrap`).
- If `bootstrapComplete === false`, only allow:
  - `POST /api/v1/bootstrap` (create initial org + admin user)
  - `GET /health`, `GET /readiness`
- All other routes return `503` with message: “System not initialized.”

### API
- `POST /api/v1/bootstrap`
  - Input: `{ orgName, adminName, adminEmail, adminPassword }`
  - Validations: password min 12 chars, email format, orgName required.
  - Creates org, admin user, and sets `bootstrapComplete = true`.
  - Returns admin tokens.

### Acceptance
- Fresh DB → bootstrap endpoint works once.
- Subsequent calls return `409` (already initialized).
- After bootstrap, normal auth/login works.

---

## 2) Auto Database Configuration (Defaults)

**Goal:** On server start, if DB is empty, it creates needed DB, indexes, and default config without manual scripts.

### CouchDB
- On startup:
  - Ensure `scheduleright` database exists.
  - Create indexes automatically (same list as `db/indexes.ts`).
  - Create `system:config` document with defaults.
- Move the index creation and database creation into the server startup path.
- Make these actions **idempotent** (safe to run on every boot).

### Defaults
Create default settings (e.g., timezone, branding, rate limits, etc.) in `system:config`:
- `timezone`: `UTC`
- `defaultAppointmentDuration`: 30
- `rateLimitProfiles`: `{ auth: 5/15m, standard: 100/15m, public: 500/15m }`

### Acceptance
- Fresh DB → server starts with indexes and defaults created.
- No manual `pnpm db:indexes` required.

---

## 3) MySQL Support (Preferred Option)

**Goal:** Add a MySQL backend option alongside CouchDB.

### Recommendation
Use **Prisma** or **Drizzle** as the data layer to support both CouchDB and MySQL via a repository interface.

### Architecture Changes
- Introduce `DataStore` interface:
  - `UserRepository`, `OrgRepository`, `SiteRepository`, `BookingRepository`, etc.
- Create `CouchDbStore` (current logic) and `MySqlStore`.
- Add config flag: `DB_PROVIDER=couchdb|mysql`.

### Schema Mapping (MySQL)
- Tables: `organizations`, `users`, `sites`, `availability`, `bookings`, `audit_logs`.
- Add indexes equivalent to CouchDB indexes.
- Use UUIDs for IDs (or ULIDs).

### Migration Plan
1. Create schema migrations (Prisma/Drizzle).
2. Add MySQL connection config in `.env`:
   - `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`.
3. Implement repositories for each service.
4. Replace direct CouchDB queries with repository calls.
5. Update health checks to test MySQL connectivity.

### Acceptance
- App runs with CouchDB as default.
- App runs with MySQL when `DB_PROVIDER=mysql`.
- All tests pass in both modes.

---

## 4) Production Readiness Checklist

### Security & Config
- [ ] Ensure `.env` has secure secrets (JWT secret min 32 chars).
- [ ] Disable debug logs from auth flow.
- [ ] Confirm CORS is locked to approved domains.
- [ ] HTTPS enforcement enabled in production.

### Data & DB
- [ ] Auto database initialization on startup.
- [ ] Index creation automated.
- [ ] Admin bootstrap enforced.
- [ ] Backup strategy documented and validated.

### Observability
- [ ] Ensure request logging doesn’t leak PII.
- [ ] Metrics endpoint secured or protected.
- [ ] Health checks validated in production.

### Testing
- [ ] Auth login + refresh tested.
- [ ] Booking create/update/cancel tested.
- [ ] Admin/staff RBAC tested.

### Deployment
- [ ] Docker builds verified.
- [ ] PM2 or systemd process manager configured.
- [ ] Nginx reverse proxy configured.

---

## 5) Immediate Next Actions

1. Implement **bootstrap endpoint** and system config doc.
2. Move index creation into startup.
3. Add `DB_PROVIDER` and draft MySQL repository layer.
4. Remove temporary debug logging from auth service.
