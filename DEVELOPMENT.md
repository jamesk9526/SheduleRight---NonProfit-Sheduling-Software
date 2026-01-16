# SheduleRight Development Environment - Setup Complete ✅

## Current Status

Your monorepo is fully scaffolded and ready for feature development!

### Running Applications

All development servers are now running:

- **Web App (Next.js PWA)**: http://localhost:3001
- **Admin Dashboard**: http://localhost:3002  
- **Widget App**: http://localhost:3003
- **Server API**: Running on port 3001 (internal) with hot reload

### What's Been Set Up

✅ **Monorepo Structure**
- 4 application packages (web, server, admin, embed)
- 9 shared library packages (schema, core, ui, pouch-sync, workflows, observability, testing, embed-widget)
- Unified TypeScript configuration with path aliases

✅ **Technology Stack**
- Frontend: Next.js 14 (App Router), React 18, Tailwind CSS, TanStack Query
- Backend: Fastify 4, Node 18+, Pino logging, jsonwebtoken, Nano (CouchDB client)
- Data: CouchDB + Redis (Docker, ready when needed)
- Validation: Zod 3.22.4 across all packages

✅ **Development Tools**
- pnpm workspaces with symlinked dependencies
- Vitest for unit/integration testing
- ESLint + Prettier for code quality
- TypeScript strict mode
- GitHub Actions CI/CD pipeline template

✅ **Documentation**
- README.md: Complete master plan with 8 milestones
- COPILOT_INSTRUCTIONS.md: AI-assisted development guide
- QUICKSTART.md: Local setup instructions

## Next Steps

### 1. Verify Local Setup (Optional - Docker)
```bash
# Start CouchDB + Redis (requires Docker)
pnpm docker:up

# Stop Docker services
pnpm docker:down
```

### 2. Development Workflow
```bash
# Start all dev servers (already running!)
pnpm dev

# Type checking across all packages
pnpm type-check

# Lint all code
pnpm lint

# Run tests (when added)
pnpm test

# Build for production
pnpm build
```

### 3. Start Milestone 1 Implementation

**Milestone 1: Foundations & Tenancy** (1-2 weeks)

Focus areas:
1. **Auth System**
   - POST /api/v1/auth/login (email/password → JWT + refresh token)
   - POST /api/v1/auth/refresh
   - Store JWT in secure cookie
   - Tests: valid/invalid credentials, token refresh

2. **RBAC (Role-Based Access Control)**
   - Middleware: requireAuth + requireRole
   - Roles: ADMIN, STAFF, VOLUNTEER, CLIENT
   - Endpoints: return 403 Forbidden for insufficient permissions

3. **Organization & Site Scoping**
   - Multi-tenancy via orgId
   - RBAC checks ensure users only see their org data
   - Seed data: test org + users with various roles

4. **Database Setup**
   - CouchDB design documents for per-org views
   - PouchDB browser for offline sync (prep)
   - Basic seed data script

### 4. Recommended Implementation Order

1. **Auth Routes** → `apps/server/src/routes/auth.ts`
   - Implement login, refresh, logout endpoints
   - Write unit tests with mocked CouchDB

2. **RBAC Middleware** → `apps/server/src/middleware/rbac.ts`
   - Extract user from JWT
   - Enforce role requirements on routes

3. **Org/Site Endpoints** → `apps/server/src/routes/orgs.ts`, `sites.ts`
   - GET/POST /api/v1/orgs
   - GET/POST /api/v1/orgs/:orgId/sites
   - Apply RBAC + tenancy checks

4. **Web UI** → `apps/web/app/(auth)/login`
   - Simple login form
   - Redirect to dashboard on success
   - Store JWT in secure httpOnly cookie

5. **Tests** → Add to each module
   - Use Vitest for unit tests
   - Mock CouchDB with test fixtures

### 5. File Structure for M1

```
apps/server/src/
  ├── routes/
  │   ├── auth.ts          (login, refresh, logout)
  │   ├── orgs.ts          (org CRUD)
  │   └── sites.ts         (site CRUD)
  ├── middleware/
  │   ├── auth.ts          (JWT extraction)
  │   └── rbac.ts          (role checking)
  ├── services/
  │   ├── auth.service.ts  (JWT creation, password hashing)
  │   ├── org.service.ts   (org queries)
  │   └── user.service.ts  (user queries, seed)
  └── tests/
      ├── auth.test.ts
      ├── rbac.test.ts
      └── fixtures/         (test data)

apps/web/app/
  ├── (auth)/
  │   └── login/
  │       ├── page.tsx     (login form)
  │       └── actions.ts   (server actions for auth)
  ├── (dashboard)/
  │   ├── page.tsx         (main dashboard)
  │   └── layout.tsx       (protected layout)
  └── api/
      └── auth/
          └── callback/... (if using NextAuth.js)
```

## Key Files to Review

- [README.md](./README.md) - Full architectural plan and milestones
- [COPILOT_INSTRUCTIONS.md](./COPILOT_INSTRUCTIONS.md) - Development guidelines for AI assistants
- [QUICKSTART.md](./QUICKSTART.md) - Local environment setup
- [packages/schema/src/index.ts](./packages/schema/src/index.ts) - Zod schemas for all entities
- [apps/server/src/config.ts](./apps/server/src/config.ts) - Environment variables
- [apps/web/app/layout.tsx](./apps/web/app/layout.tsx) - Web app setup with providers

## Common Commands

```bash
# Add a new package dependency
pnpm add <package> -w               # Root workspace
pnpm add <package> -w --filter=@packages/schema

# Run a command in one workspace
pnpm --filter=apps/web dev
pnpm --filter=apps/server type-check

# View workspace info
pnpm list --depth=0

# Clean install (if needed)
rm -r node_modules pnpm-lock.yaml
pnpm install
```

## Environment Variables

Copy `.env.example` to `.env.local` and fill in values:
```bash
# Server
NODE_ENV=development
PORT=3001
COUCHDB_URL=http://localhost:5984
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-key
JWT_EXPIRY=7d

# Web
NEXT_PUBLIC_API_URL=http://localhost:3001

# Twilio (when adding SMS)
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=...
```

## Troubleshooting

**Port already in use?**
```bash
# Kill process on port 3000 (Windows PowerShell)
Get-Process | Where-Object { $_.Handles -eq 3000 } | Stop-Process -Force
# Or just let Next.js use port 3001 (it will automatically)
```

**Dependencies not installing?**
```bash
pnpm install --no-frozen-lockfile
```

**TypeScript errors?**
```bash
# Clear cache and reinstall
rm -r node_modules .next dist
pnpm install
pnpm type-check
```

---

**You're all set!** Start building Milestone 1. Reference COPILOT_INSTRUCTIONS.md for code patterns and Copilot prompting best practices.
