# ScheduleRight

> **Offline-first scheduling platform for non-profit pregnancy care centers**

![Node.js](https://img.shields.io/badge/Node.js-20.x-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)
![Next.js](https://img.shields.io/badge/Next.js-14.x-black)
![MySQL](https://img.shields.io/badge/MySQL-8.0-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## 🎯 Overview

ScheduleRight is an open-source scheduling platform designed specifically for non-profit pregnancy care centers. It enables seamless appointment scheduling, volunteer management, and client communication with an emphasis on privacy, reliability, and offline-first data synchronization.

**Key Features:**
- 📅 **Smart Scheduling**: Availability slots with recurring patterns, automatic conflict detection
- 👥 **Client Bookings**: Public booking interface with capacity management
- 👨‍💼 **Staff Management**: Multi-role access control (ADMIN, STAFF, CLIENT), organization-wide sites
- 💬 **SMS Reminders**: Twilio integration for automated appointment reminders
- 👤 **Volunteer Coordination**: Volunteer profiles, shift management, and assignments
- 🔐 **Secure Authentication**: JWT-based auth with refresh tokens, RBAC enforcement
- 📱 **Offline-First**: Progressive Web App (PWA) with local data sync (PouchDB)
- 🗄️ **Flexible Storage**: MySQL or CouchDB backend (configurable)

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 20.x
- **pnpm** 8.x
- **MySQL** 8.0 or **CouchDB** 3.3 (Docker recommended)
- **.env file** with required secrets (see `.env.example`)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/SheduleRight.git
   cd SheduleRight
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials and secrets
   ```

4. **Start services:**
   ```bash
   # Start MySQL and CouchDB (if using Docker)
   docker-compose up -d

   # Start dev servers (web + server)
   pnpm dev
   ```

5. **Initialize database:**
   - Open http://localhost:3001/api/v1/bootstrap
   - Complete the bootstrap flow to create your first admin account
   - Log in at http://localhost:3000

---

## 📋 Core Features

### 1. **Availability & Booking Management**
- Create availability slots with flexible recurrence patterns (daily, weekly, monthly, once)
- Set capacity limits per slot
- Automatic conflict detection
- Soft delete with audit trail
- Status tracking (pending → confirmed/completed/cancelled/no-show)

**Endpoints:**
```
POST   /api/v1/sites/:siteId/availability        # Create slot
GET    /api/v1/sites/:siteId/availability        # List all
PUT    /api/v1/availability/:slotId/deactivate   # Soft delete

POST   /api/v1/sites/:siteId/bookings            # Create booking (public)
GET    /api/v1/bookings/me                       # My bookings
PUT    /api/v1/bookings/:bookingId/confirm       # Confirm (STAFF+)
PUT    /api/v1/bookings/:bookingId/cancel        # Cancel
```

### 2. **Organization & Multi-Site Support**
- Organization creation (ADMIN only)
- Per-organization sites
- Role-based access control
- Organization branding (planned)

**Endpoints:**
```
POST   /api/v1/orgs                              # Create org
GET    /api/v1/orgs                              # List user's orgs
GET    /api/v1/orgs/:orgId                       # Get org details
POST   /api/v1/orgs/:orgId/sites                 # Create site
GET    /api/v1/orgs/:orgId/sites                 # List sites
```

### 3. **Authentication & RBAC**
- JWT tokens (15-min access, 7-day refresh)
- Email/password login
- HttpOnly refresh cookies
- Role enforcement (ADMIN, STAFF, CLIENT)
- Automatic request ID tracking for debugging

**Endpoints:**
```
POST   /api/v1/auth/login                        # Login
POST   /api/v1/auth/refresh                      # Refresh token
GET    /api/v1/users/me                          # Current user
```

### 4. **Volunteer Management**
- Volunteer profiles with contact info
- Shift scheduling and assignment
- Status tracking (active, inactive, etc.)

**Endpoints:**
```
POST   /api/v1/volunteers                        # Create volunteer
GET    /api/v1/volunteers                        # List volunteers
POST   /api/v1/volunteers/:volunteerId/shifts    # Create shift
POST   /api/v1/volunteers/:volunteerId/assign    # Assign to shift
```

### 5. **SMS Reminders**
- Twilio integration for automated SMS
- Per-organization reminder settings
- Reminder templates (customizable)
- Status tracking

**Endpoints:**
```
GET    /api/v1/reminders/:orgId/settings         # Get settings
PUT    /api/v1/reminders/:orgId/settings         # Update settings
POST   /api/v1/reminders/send                    # Send reminder (WIP)
```

### 6. **Admin Bootstrap**
- First-run initialization flow
- Auto-create admin account
- Ensure default system config
- Required before other routes activate

**Endpoints:**
```
POST   /api/v1/bootstrap                         # Complete bootstrap
GET    /api/v1/bootstrap/status                  # Check bootstrap status
```

---

## 🏗️ Architecture

### Tech Stack

**Backend:**
- **Framework**: Fastify 4.x (lightweight, high-performance HTTP server)
- **Language**: TypeScript 5.3
- **Database**: MySQL 8.0 (primary) or CouchDB 3.3 (alternative)
- **Auth**: JWT (jsonwebtoken)
- **Validation**: Zod
- **Logging**: Pino
- **Queue** (future): BullMQ
- **SMS**: Twilio

**Frontend:**
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript 5.3
- **Styling**: Tailwind CSS
- **State**: TanStack Query (React Query)
- **Validation**: Zod
- **Offline**: PouchDB (progressive sync)

**DevOps:**
- **Containerization**: Docker & Docker Compose
- **Package Manager**: pnpm (monorepo)
- **Testing**: Vitest
- **Linting**: ESLint, TypeScript strict mode

### Project Structure

```
.
├── apps/
│   ├── server/                 # Fastify API server
│   │   ├── src/
│   │   │   ├── index.ts       # Server bootstrap, middleware, routes
│   │   │   ├── config.ts      # Environment config validation (Zod)
│   │   │   ├── db/            # Database layer (MySQL, CouchDB)
│   │   │   ├── services/      # Business logic (Auth, Org, Booking, etc.)
│   │   │   ├── routes/        # HTTP endpoints (organized by domain)
│   │   │   ├── middleware/    # Fastify hooks (auth, logging, rate-limit)
│   │   │   └── __tests__/     # Integration & E2E tests
│   ├── web/                    # Next.js frontend
│   │   ├── app/               # App Router pages
│   │   ├── lib/               # Hooks, utilities
│   │   ├── public/            # Assets, PWA icons
│   │   └── components/        # Reusable UI (future)
│   ├── admin/                  # Admin panel (Next.js) - WIP
│   └── embed/                  # Embeddable widget (Next.js) - WIP
├── packages/
│   ├── core/                   # Shared business logic
│   ├── schema/                 # Zod schemas, types
│   ├── ui/                     # Shared UI components
│   ├── testing/                # Test utilities
│   └── observability/          # Logging, metrics
├── infra/
│   └── docker-compose.yml      # Local dev environment
├── docs/                       # Architecture docs, ADRs
└── pnpm-workspace.yaml         # Monorepo config
```

### Database Schema (MySQL)

**Core Tables:**
- `organizations` - Tenant info
- `users` - User accounts with roles
- `sites` - Per-org locations
- `availability` - Scheduling slots
- `bookings` - Client appointments
- `audit_logs` - Change trail
- `system_config` - Global settings
- `system_bootstrap` - Initialization state

**Volunteer Tables:**
- `volunteers` - Volunteer profiles
- `shifts` - Shift definitions
- `shift_assignments` - Volunteer-shift relationships

**Documents Table (JSON bridge):**
- `documents` - Generic document store for CouchDB parity

**Migrations:**
- `001_documents_indexes.sql` - Base indexes
- `002_users_orgs.sql` - Query optimization
- `003_volunteers_shifts.sql` - Volunteer management

### Authentication Flow

```
Client Login
    ↓
POST /api/v1/auth/login { email, password }
    ↓
Verify password
    ↓
Generate JWT (15-min) + Refresh Token (7-day)
    ↓
Return { accessToken, refreshToken (HttpOnly cookie) }
    ↓
Store accessToken in localStorage
    ↓
All requests: Authorization: Bearer <accessToken>
    ↓
On expiry: POST /api/v1/auth/refresh → new token
```

---

## 🔧 Development

### Running Locally

```bash
# Install dependencies
pnpm install

# Start Docker containers (MySQL, CouchDB)
docker-compose up -d

# Run all dev servers (watches for changes)
pnpm dev

# Run server only
pnpm --filter @scheduleright/server run dev

# Run web only
pnpm --filter @scheduleright/web run dev
```

### Database Commands

```bash
# Initialize MySQL schema and run migrations
pnpm --filter @scheduleright/server run db:mysql:init
pnpm --filter @scheduleright/server run db:mysql:migrate

# Seed test data
pnpm --filter @scheduleright/server run seed

# Create CouchDB indexes
pnpm --filter @scheduleright/server run db:indexes
```

### Testing

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Server tests only
pnpm --filter @scheduleright/server test

# With coverage (via Vitest)
pnpm test -- --coverage
```

### Linting & Type Checking

```bash
# Lint all packages
pnpm lint

# Format code
pnpm format

# Type check (no emit)
pnpm type-check
```

---

## 🔐 Environment Configuration

Create a `.env` file based on `.env.example`:

```bash
# Database
DB_PROVIDER=mysql                          # or 'couchdb'
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=scheduleright
MYSQL_USER=root
MYSQL_PASSWORD=

# CouchDB (if using)
COUCHDB_URL=http://localhost:5984
COUCHDB_USER=admin
COUCHDB_PASSWORD=password

# Server
NODE_ENV=development
SERVER_PORT=3001
JWT_SECRET=your-secret-key-min-32-chars

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:3001

# Twilio (optional)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
TWILIO_VERIFY_SID=
```

---

## 📊 API Documentation

### Health & Status Endpoints

```bash
# Liveness probe
GET /health
→ { status: "ok", uptime: 123 }

# Readiness probe (detailed health checks)
GET /readiness
→ { status: "healthy", database: "connected", ... }

# Metrics
GET /metrics
→ { requestCount, avgResponseTime, ... }

# HTML status page with diagnostics
GET /status
→ Interactive dashboard showing all services
```

### Error Handling

All endpoints return consistent error responses:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": [...]
}
```

**Status Codes:**
- `200` - Success
- `400` - Validation error
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not found
- `409` - Conflict (duplicate, capacity exceeded, etc.)
- `500` - Server error

---

## 🚢 Deployment

### Docker

```bash
# Build images
docker-compose -f docker-compose.prod.yml build

# Run production
docker-compose -f docker-compose.prod.yml up
```

### Manual (Ubuntu 22.04)

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install pnpm
npm install -g pnpm

# Clone repo
git clone https://github.com/yourusername/SheduleRight.git
cd SheduleRight

# Install dependencies
pnpm install

# Build
pnpm build

# Set up systemd service (see DEPLOYMENT.md)
```

---

## 📚 Additional Resources

- [**BOOKING_API_GUIDE.md**](./BOOKING_API_GUIDE.md) - Complete booking API with examples
- [**DEPLOYMENT.md**](./DEPLOYMENT.md) - Production deployment guide
- [**TROUBLESHOOTING.md**](./TROUBLESHOOTING.md) - Common issues & solutions
- [**OPERATIONS.md**](./OPERATIONS.md) - Operational runbook
- [**GITHUB_COPILOT_TODO.md**](./GITHUB_COPILOT_TODO.md) - Development checklist & next steps

---

## 🐛 Known Limitations & Planned Features

### Current Limitations
- Twilio SMS sending not yet implemented (endpoints ready, wiring pending)
- PouchDB offline sync scaffolded but not yet integrated
- Admin panel and embed widget in early stages
- Multi-tenancy branding customization not yet available

### Planned Features
- 📖 Online documentation site (Nextra)
- 🎨 Organization branding (logos, colors, custom domain)
- 📊 Advanced analytics dashboard
- 🔄 Offline-first with PouchDB sync
- 🌍 Multi-language support
- ⏰ Timezone-aware scheduling
- 📱 Native mobile apps (React Native)

---

## 🤝 Contributing

We welcome contributions! Please see our [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Development Setup
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make changes and commit: `git commit -m 'Add my feature'`
4. Push to your fork: `git push origin feature/my-feature`
5. Open a Pull Request

### Code Standards
- TypeScript with strict mode enabled
- Zod for all input validation
- 100% ESM (server), CommonJS (Next.js)
- Tests required for new features
- Conventional commit messages

---

## 📈 Project Status

**Version:** 0.0.1 (Alpha)  
**Last Updated:** January 16, 2026

### Completed (9/12 Goals)
✅ Authentication system (JWT, RBAC)  
✅ Organization & site management  
✅ Availability & booking lifecycle  
✅ Web UI (login, dashboard, bookings)  
✅ Volunteer management (profiles, shifts)  
✅ SMS reminders settings  
✅ Admin bootstrap flow  
✅ MySQL support with migrations  
✅ Comprehensive test suite (110+ tests)  

### In Progress
🔄 Twilio SMS integration  
🔄 Production hardening & security  

### Not Started
⏳ Monitoring & observability (Pino, Prometheus)  
⏳ Advanced admin dashboard  
⏳ Multi-language support  

See [GITHUB_COPILOT_TODO.md](./GITHUB_COPILOT_TODO.md) for detailed roadmap.

---

## 📝 License

This project is licensed under the **MIT License** - see [LICENSE](./LICENSE) file for details.

---

## 💬 Support & Contact

- **Issues**: [GitHub Issues](https://github.com/yourusername/SheduleRight/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/SheduleRight/discussions)
- **Email**: support@scheduleright.org (coming soon)

---

## 🙏 Acknowledgments

Built with ❤️ for non-profit organizations serving their communities.

**Key Technologies:**
- [Fastify](https://www.fastify.io/) - Fast and low overhead web framework
- [Next.js](https://nextjs.org/) - React framework for production
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS
- [TypeScript](https://www.typescriptlang.org/) - Type safety for JavaScript
- [Docker](https://www.docker.com/) - Containerization & local development

---

**Made with 💙 for healthcare**
