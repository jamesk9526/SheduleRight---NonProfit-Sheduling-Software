# Copilot Instructions for SheduleRight Development

This document guides developers on conventions, code organization, patterns, and best practices for working with AI assistants (Copilot) during implementation of SheduleRight. It ensures consistency, reduces rework, and accelerates feature delivery.

## Table of Contents
1. [Getting Started](#getting-started)
2. [Code Organization & Conventions](#code-organization--conventions)
3. [Monorepo Structure Navigation](#monorepo-structure-navigation)
4. [Common Patterns & Templates](#common-patterns--templates)
5. [Working with AI Assistant](#working-with-ai-assistant)
6. [PR & Review Process](#pr--review-process)
7. [Testing & Quality](#testing--quality)
8. [Performance & Security Checklists](#performance--security-checklists)
9. [Troubleshooting & Quick Fixes](#troubleshooting--quick-fixes)
10. [Communication Tips](#communication-tips)

---

## Getting Started

### Prerequisites
- Node 18+, pnpm (preferred over npm)
- Docker (for CouchDB, Redis in dev)
- Twilio test account
- TypeScript knowledge; React/Next.js preferred

### Initial Setup
```bash
# Clone and install
git clone https://github.com/james-knox/SheduleRight.git
cd SheduleRight
pnpm install

# Start dev environment
docker compose -f infra/docker-compose.yml up -d
pnpm dev
```

### First Task Checklist
- [ ] Read README.md (master plan)
- [ ] Review `ARCHITECTURE.md` if present (or request from Copilot)
- [ ] Pick a milestone from Milestones section
- [ ] Create a feature branch (`git checkout -b feat/your-feature`)
- [ ] Ask Copilot: "Help me scaffold the first implementation of [feature]"

---

## Code Organization & Conventions

### Directory Structure Philosophy
- **apps/**: user-facing applications (web PWA, server API, admin UI, widget demo)
- **packages/**: reusable libraries shared across apps (types, schemas, UI components, sync logic)
- **infra/**: Docker, CI/CD, deployment configs, secrets templates
- **docs/**: architecture decisions, guides, API docs
- **tests/**: integration and e2e tests (separate from unit tests in packages/)

### TypeScript Conventions
- **Strict mode**: `"strict": true` in all `tsconfig.json` files; no `any` without `// @ts-expect-error` justification.
- **File naming**: 
  - Components: `PascalCase.tsx` (e.g., `BookingForm.tsx`)
  - Utilities: `camelCase.ts` (e.g., `formatDate.ts`)
  - Types: `PascalCase.ts` (e.g., `Booking.ts`) or co-located in `.types.ts` suffix
  - Tests: `*.test.ts` or `*.spec.ts` (collocated with source)
- **Exports**: default exports for components, named exports for utilities/types.
- **Imports**: absolute paths via `tsconfig` paths (e.g., `import { Booking } from '@packages/schema'`)

### React & Next.js Conventions
- **App Router**: all new features in `app/` directory; Pages Router deprecated.
- **Server components by default**: mark client components with `'use client'` at the top.
- **API routes**: prefer `/v1/` versioning; place in `app/api/v1/` or dedicated `apps/server/src/routes/`.
- **State management**: TanStack Query for server state, React Context for UI state (avoid Redux for MVP).
- **Component structure**:
  ```typescript
  // MyComponent.tsx
  'use client'
  import { FC } from 'react'
  
  interface MyComponentProps {
    title: string
    onSubmit?: (data: unknown) => void
  }
  
  const MyComponent: FC<MyComponentProps> = ({ title, onSubmit }) => {
    // component logic
    return <div>{title}</div>
  }
  
  export default MyComponent
  ```

### Styling Conventions
- **Tailwind CSS** with optional Radix UI or Headless UI primitives.
- **No styled-components or CSS-in-JS** in the PWA (performance + CSP constraints).
- **Theme variables**: CSS custom properties in `app/globals.css` or `tailwind.config.js`.
- **Responsive design**: mobile-first approach; use Tailwind breakpoints (`sm:`, `md:`, `lg:`, etc.).

### Error Handling Conventions
- **Server errors**: structured JSON with `{ code, message, details?, timestamp }`.
- **Client errors**: user-friendly toast/modal messages; log details to observability.
- **Validation**: use Zod schemas in `@packages/schema`; validate on both client and server.
- **Try-catch**: wrap async operations; re-throw or emit error events; avoid silent failures.

---

## Monorepo Structure Navigation

### Key Packages & Their Responsibilities

| Package | Purpose | Key Files |
|---------|---------|-----------|
| `packages/schema` | JSON Schemas, Zod types, validation | `src/types/*.ts`, `src/schemas/*.json`, `src/validate.ts` |
| `packages/core` | Domain logic, scheduling engine, rules | `src/scheduling/`, `src/rules/`, `src/models/` |
| `packages/pouch-sync` | PouchDB setup, replication, conflict resolution | `src/browser.ts`, `src/node.ts`, `src/replication.ts` |
| `packages/ui` | Shared React components | `src/components/**/*.tsx`, `src/hooks/` |
| `packages/workflows` | Twilio flows, reminder schedulers | `src/twilio/`, `src/reminders/` |
| `packages/observability` | Logging, metrics, tracing | `src/logger.ts`, `src/metrics.ts`, `src/trace.ts` |
| `apps/web` | Next.js PWA | `app/`, `public/sw.js`, `src/lib/` |
| `apps/server` | Node API | `src/index.ts`, `src/routes/`, `src/middleware/` |
| `apps/admin` | Admin UI | `app/`, built separately |
| `apps/embed` | Widget demo host | `public/`, minimal app |
| `packages/embed-widget` | Drop-in booking widget | `src/index.ts`, `src/widget.ts`, `dist/` (UMD) |

### Importing Across Packages
```typescript
// Within apps/web, import from packages/schema
import { Booking } from '@packages/schema'
import { BookingForm } from '@packages/ui'

// Circular dependency check: never import apps from packages
// packages should not import from apps; use dependency injection if needed
```

---

## Common Patterns & Templates

### API Endpoint Pattern (Fastify)
```typescript
// apps/server/src/routes/bookings.ts
import { FastifyInstance } from 'fastify'
import { CreateBookingRequest, Booking } from '@packages/schema'

export async function registerBookingRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: CreateBookingRequest }>('/v1/bookings', async (request, reply) => {
    try {
      // Validate org/site scoping from JWT
      const { orgId, siteId } = request.user
      const booking = await createBooking({ ...request.body, orgId, siteId })
      reply.code(201).send({ data: booking })
    } catch (error) {
      fastify.log.error(error)
      reply.code(400).send({ error: 'Booking failed' })
    }
  })
}
```

### React Client Component Pattern
```typescript
// apps/web/app/(dashboard)/bookings/BookingForm.tsx
'use client'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useState, FC } from 'react'
import { BookingForm as BookingFormSchema } from '@packages/schema'
import { Button, Input } from '@packages/ui'

const BookingForm: FC = () => {
  const [formData, setFormData] = useState<BookingFormSchema>({})
  const mutation = useMutation({
    mutationFn: (data: BookingFormSchema) => fetch('/api/v1/bookings', { method: 'POST', body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: (data) => {
      // refresh calendar, show toast, etc.
    }
  })

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(formData) }}>
      <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
      <Button disabled={mutation.isPending}>{mutation.isPending ? 'Booking...' : 'Book'}</Button>
    </form>
  )
}

export default BookingForm
```

### PouchDB Replication Pattern
```typescript
// packages/pouch-sync/src/replication.ts
import PouchDB from 'pouchdb-browser'

export async function setupReplication(orgId: string, token: string) {
  const localDb = new PouchDB(`org_${orgId}`)
  const remoteUrl = `${API_URL}/replicate/db?org=${orgId}&token=${token}`
  
  const sync = localDb.sync(remoteUrl, { live: true, retry: true })
    .on('change', (info) => console.log('Synced:', info))
    .on('error', (err) => console.error('Sync error:', err))
  
  return { localDb, sync }
}
```

### Zod Schema Pattern
```typescript
// packages/schema/src/booking.ts
import { z } from 'zod'

export const CreateBookingRequest = z.object({
  serviceId: z.string().uuid(),
  clientId: z.string().uuid(),
  startTime: z.string().datetime(),
  durationMinutes: z.number().int().min(15),
  notes: z.string().optional()
})

export type CreateBookingRequest = z.infer<typeof CreateBookingRequest>
```

### Middleware Pattern (RBAC)
```typescript
// apps/server/src/middleware/rbac.ts
import { FastifyRequest } from 'fastify'

export async function rbacMiddleware(request: FastifyRequest, role: 'admin' | 'scheduler' | 'staff') {
  if (!request.user || !request.user.roles.includes(role)) {
    throw new Error('Unauthorized')
  }
}
```

---

## Working with AI Assistant

### Best Practices for Prompts

#### 1. Context First
Provide file paths, feature name, and acceptance criteria before asking for code:
```
"In apps/web/app/(dashboard)/availability/page.tsx, implement a schedule grid 
that shows resources (columns) × time slots (rows). 
- Use TanStack Query to fetch availability from GET /v1/availability
- Use Tailwind for styling; make it responsive
- Show loading state while fetching
- Can you scaffold this component?"
```

#### 2. Be Specific About Constraints
```
"Write a service worker for apps/web/public/sw.js that:
- Precaches critical assets (CSS, JS bundles)
- Caches GET /api/v1/* with stale-while-revalidate
- Queues POST/PATCH requests in IndexedDB if offline
- Don't use eval or any CSP violations; must work with content-security-policy header"
```

#### 3. Reference Existing Patterns
```
"Follow the API endpoint pattern in apps/server/src/routes/bookings.ts 
to create apps/server/src/routes/clients.ts with endpoints:
- GET /v1/clients?orgId=... (list, paginated)
- POST /v1/clients (create with JSON Schema validation)
- PATCH /v1/clients/{id} (update)
Validate request using @packages/schema types."
```

#### 4. Clarify Trade-offs
```
"Should we implement offline conflict resolution as last-write-wins or CRDT?
We need to prevent double-booking on resources. 
Trade-offs:
- Last-write-wins: simple, but risks overwriting valid updates
- CRDT: robust but adds complexity
My preference: last-write-wins + server-side validation."
```

### Common Requests & Responses

| Request | How to Ask | What to Expect |
|---------|-----------|----------------|
| Scaffold a feature | "Create the folder structure and stub files for [feature]" | Files with TODO comments; imports resolved |
| Implement business logic | "Implement [rule] with tests" | Typed functions, unit tests, comments |
| Fix a bug | Paste error + code snippet; "This fails because..." | Root cause, fix, test case |
| Refactor code | "This code violates [pattern]; refactor to..." | Cleaner, idiomatic version |
| Generate tests | "Write Playwright e2e test for [workflow]" | Complete test file with assertions |

### Avoiding Common Issues

**Problem**: "AI generated code with `any` types or missing error handling"
**Solution**: Ask explicitly: "Use strict TypeScript (no `any`); include error handling and logging"

**Problem**: "Generated React component doesn't use hooks correctly"
**Solution**: Reference the pattern file: "Follow the React Client Component Pattern from COPILOT_INSTRUCTIONS.md"

**Problem**: "API endpoint doesn't validate tenant scoping"
**Solution**: Remind: "Every endpoint must validate `orgId` and `siteId` from `request.user` and filter results"

---

## PR & Review Process

### Before Opening a PR
- [ ] Run `pnpm lint` and `pnpm type-check` locally; fix any errors
- [ ] Run tests: `pnpm test`; add tests for new logic
- [ ] Check bundle size budgets: `pnpm build:web && pnpm analyze`
- [ ] Update README.md or docs if adding new patterns
- [ ] Squash commits into logical units; write clear commit messages

### PR Title & Description Template
```
[Milestone] Feature: Brief description

## What
Implement [feature] as per [milestone] acceptance criteria.

## How
- Approach/algorithm used
- Key files modified
- Any trade-offs made

## Tests
- Unit tests: 5 tests added covering [scenarios]
- E2E: [workflow] tested in Playwright

## Checklist
- [ ] Tests passing
- [ ] Type-safe (no `any`)
- [ ] Follows code conventions
- [ ] No security/performance regressions
- [ ] Docs/README updated
```

### Code Review Checklist for AI-Generated Code
- [ ] Types are strict (no implicit `any`)
- [ ] Error handling is explicit (try-catch, error boundaries)
- [ ] Logging is present and doesn't expose PII
- [ ] Tenant scoping (`orgId`, `siteId`) validated on server
- [ ] Tests cover happy path + error cases
- [ ] Performance: no N+1 queries, pagination enforced
- [ ] Security: no SQL injection, XSS, or CSRF vulnerabilities

---

## Testing & Quality

### Test Structure
```
packages/
  schema/
    src/
      booking.ts
      booking.test.ts  ← unit test collocated
apps/
  web/
    app/
      (dashboard)/
        __tests__/
          page.test.tsx  ← component tests in __tests__
  server/
    src/
      routes/
        bookings.test.ts
tests/  ← e2e and integration tests
  e2e/
    booking.flow.spec.ts
```

### Test Patterns

**Unit Test** (Vitest):
```typescript
import { describe, it, expect } from 'vitest'
import { generateSlots } from '@packages/core/scheduling'

describe('generateSlots', () => {
  it('respects resource availability', () => {
    const slots = generateSlots({
      resourceId: 'room-1',
      date: '2026-01-20',
      duration: 30,
      available: [{ start: '09:00', end: '17:00' }]
    })
    expect(slots).toHaveLength(16) // 8h × 30min
  })
})
```

**Component Test** (Vitest + React Testing Library):
```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import BookingForm from './BookingForm'

describe('BookingForm', () => {
  it('submits form data', async () => {
    const handleSubmit = vi.fn()
    render(<BookingForm onSubmit={handleSubmit} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Test' } })
    fireEvent.click(screen.getByRole('button', { name: /book/i }))
    expect(handleSubmit).toHaveBeenCalled()
  })
})
```

**E2E Test** (Playwright):
```typescript
import { test, expect } from '@playwright/test'

test('book an appointment and receive SMS confirmation', async ({ page }) => {
  await page.goto('http://localhost:3000/booking')
  await page.selectOption('[data-service]', 'pregnancy-test')
  await page.click('[data-slot="09:00"]')
  await page.fill('[data-phone]', '+15551234567')
  await page.click('button:has-text("Confirm")')
  await expect(page.locator('[data-success]')).toBeVisible()
})
```

### Coverage Targets
- Core scheduling logic: 90%+ coverage
- API routes: 80%+ coverage
- UI components: 70%+ (focus on critical user flows)
- E2E: at least one test per milestone workflow

---

## Performance & Security Checklists

### Performance Checklist
- [ ] PWA shell: < 200KB gzip
- [ ] TTI: < 3s on mid-tier devices (staging target)
- [ ] API availability search: < 300ms p95
- [ ] PouchDB queries: < 100ms for typical org/site size
- [ ] Bundle budgets enforced in CI
- [ ] Images optimized (Next.js `<Image>`)
- [ ] No render blockers in critical path
- [ ] Pagination enforced on list endpoints (default 50/page)

### Security Checklist
- [ ] No hardcoded secrets in code; use .env + platform vault
- [ ] All user inputs validated with Zod
- [ ] CSRF tokens on state-changing requests
- [ ] Rate limiting on public API endpoints
- [ ] Tenant scoping enforced server-side
- [ ] Sensitive fields (PHI) redacted in logs
- [ ] HTTPS enforced in production
- [ ] CORS allowlist explicitly defined
- [ ] Webhook signatures validated (HMAC)
- [ ] JWT tokens: short TTL (15min access), refresh tokens secured in httpOnly cookies
- [ ] No PII in SMS/email messages
- [ ] Dependencies scanned for vulnerabilities (`pnpm audit`)

---

## Troubleshooting & Quick Fixes

### Issue: Type Error on Build
```
error TS2554: Expected X arguments, got Y
```
**Solution**: Check tsconfig paths and import statements; ensure types are exported correctly from packages.
**Ask Copilot**: "Fix this TypeScript error: [error + code snippet]"

### Issue: PouchDB Replication Fails
```
Error: unauthorized, 401, Admin Party disabled
```
**Solution**: Ensure CouchDB is running (`docker compose up couchdb`); check auth tokens; verify replication URL is correct.
**Ask Copilot**: "Debug PouchDB replication: [error + setup code]"

### Issue: Service Worker Caching Issues
```
Changes don't reflect after deploy
```
**Solution**: Clear browser cache or bump SW version; check cache-busting logic in sw.js.
**Ask Copilot**: "Implement cache-busting for service worker assets"

### Issue: Race Condition in Offline Booking
```
Booking saved locally but server commit failed; user sees success but booking never syncs
```
**Solution**: Use outbox pattern with idempotent IDs; retry with backoff; surface sync status to user.
**Ask Copilot**: "Implement idempotent booking creation with retry logic"

---

## Communication Tips

### Effective Copilot Interaction

**Good**: "In apps/web, create a component that displays a schedule grid. 
It should fetch from `/v1/availability`, show 2 weeks of time slots, 
allow clicking to select a slot, and be responsive on mobile. 
Use Tailwind for styling and TanStack Query for data. 
Add loading/error states."

**Bad**: "Make a calendar component"

**Good**: "Following the RBAC middleware pattern in apps/server/src/middleware/rbac.ts, 
create a route that lists resources but filters by user's allowed sites. 
Only Admin and Scheduler roles can access. Write a test that verifies 
a Staff user gets 403 for unauthorized sites."

**Bad**: "Write a resources endpoint"

**Good**: "This booking conflicts with an existing one due to a race condition. 
The server should use database-level locking or transactions. 
What's the best approach in CouchDB, and how should we implement it?"

**Bad**: "Booking conflicts are happening"

### Asking for Refactoring
```
"This utility module packages/core/scheduling.ts is getting large (500 LOC).
How should we split it? Options:
1. Separate into scheduling/slot-generator.ts, scheduling/validator.ts, scheduling/rules.ts
2. Keep in core but extract rules to a separate package
My preference: option 1. Can you refactor and add index.ts barrel exports?"
```

### Escalation
If Copilot's output is incorrect or incomplete:
```
"This implementation of [feature] has a bug: [describe bug]. 
Can you explain the issue and provide a corrected version? 
Consider [constraint/requirement]."
```

---

## Quick Reference: File Templates

### New API Route
Ask: "Create an API route in apps/server following the [entity] CRUD pattern from COPILOT_INSTRUCTIONS.md"

### New React Component
Ask: "Create a new Client Component at [path] with these props: [list]. Use the React Client Component Pattern."

### New Schema
Ask: "Create a Zod schema in packages/schema/src/[entity].ts with validation for [fields]"

### New Test
Ask: "Write a Vitest unit test for [function] that covers these cases: [list]"

---

## Resources & Escalation

### Documentation
- **Master Plan**: README.md (vision, features, milestones)
- **Architecture**: Ask Copilot to generate ARCHITECTURE.md if missing
- **API Docs**: Will be auto-generated from OpenAPI/Swagger stubs
- **Patterns**: This file (COPILOT_INSTRUCTIONS.md)

### Getting Help
- **Bug**: Create a GitHub issue with error trace + reproduction steps
- **Design question**: Add ADR in `docs/adr/` (Decision template provided)
- **Performance**: Profile with Chrome DevTools; ask Copilot for optimization
- **Security**: Escalate to senior reviewer before merging; use security checklist

### Recommended Copilot Practices
1. **Start each session** by asking: "Summarize the current milestone and what I should focus on next"
2. **Break large features** into smaller PRs; ask Copilot to create a task breakdown
3. **Request reviews** of your Copilot-generated code by experienced team members
4. **Document trade-offs** in PR descriptions and ADRs
5. **Test thoroughly** before merging; don't rely on Copilot's tests alone

---

This guide evolves as patterns emerge. Suggest improvements or new sections via PR or discussion.

**Last updated**: January 16, 2026
