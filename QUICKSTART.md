# SheduleRight — Quick Start Guide

## Prerequisites
- Node.js 18+ ([download](https://nodejs.org/))
- pnpm 8+ (`npm install -g pnpm`)
- Docker & Docker Compose ([download](https://www.docker.com/products/docker-desktop))
- Git

## Installation

### 1. Clone & Install
```bash
cd SheduleRight---NonProfit-Sheduling-Software
pnpm install
```

### 2. Start Development Environment
```bash
# Start CouchDB + Redis
pnpm docker:up

# In another terminal, start dev servers
pnpm dev
```

This will run:
- **apps/web**: Next.js PWA on http://localhost:3000
- **apps/server**: Fastify API on http://localhost:3001
- **apps/admin**: Next.js Admin on http://localhost:3002
- **apps/embed**: Widget demo on http://localhost:3003

### 3. Verify Setup
```bash
# Check type safety
pnpm type-check

# Run tests
pnpm test

# Lint code
pnpm lint
```

## Key Commands

### Development
```bash
pnpm dev              # Start all dev servers
pnpm dev -F apps/web  # Start only web app
pnpm build            # Build all packages
pnpm clean            # Clean build artifacts
```

### Database
```bash
pnpm docker:up        # Start CouchDB + Redis
pnpm docker:down      # Stop containers
pnpm docker:logs      # View logs
```

### Testing & Quality
```bash
pnpm test             # Run all tests once
pnpm test:watch       # Watch mode
pnpm type-check       # TypeScript check
pnpm lint             # ESLint + Prettier
```

## Environment Setup

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Update with your credentials:
```env
TWILIO_ACCOUNT_SID=YOUR_SID
TWILIO_AUTH_TOKEN=YOUR_TOKEN
JWT_SECRET=your-dev-secret
```

3. For CouchDB access, open http://localhost:5984/_utils and login with:
   - Username: `admin`
   - Password: `changeme`

## Architecture Overview

- **apps/web**: Next.js PWA with offline-first PouchDB sync
- **apps/server**: Fastify API, Twilio integration, CouchDB replication
- **apps/admin**: Admin UI for org/site customization
- **apps/embed**: Widget demo & testing
- **packages/schema**: Shared types & Zod schemas
- **packages/core**: Scheduling engine & domain logic
- **packages/ui**: Reusable React components
- **packages/pouch-sync**: PouchDB setup & replication
- **packages/workflows**: Twilio flows & reminders
- **packages/observability**: Logging & tracing

## Troubleshooting

### pnpm install fails
```bash
# Clear pnpm cache
pnpm store prune

# Reinstall
pnpm install
```

### Port already in use
```bash
# Change port in next.config.js or env
NEXT_PUBLIC_API_URL=http://localhost:3001 pnpm dev
```

### CouchDB connection error
```bash
# Verify services running
docker ps

# Check logs
pnpm docker:logs
```

## Next Steps

1. Review README.md for full master plan
2. Read COPILOT_INSTRUCTIONS.md for development guidelines
3. Start with M1 (Foundations & Tenancy) milestone
4. Check docs/adr/ for architecture decisions

---

For help, refer to README.md or COPILOT_INSTRUCTIONS.md.
