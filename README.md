# ScheduleRight

> **Offline-first scheduling platform for non-profit pregnancy care centers**

![Node.js](https://img.shields.io/badge/Node.js-20.x-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)
![Next.js](https://img.shields.io/badge/Next.js-14.x-black)
![MySQL](https://img.shields.io/badge/MySQL-8.0-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## 🎯 Overview

ScheduleRight is an open-source scheduling platform designed specifically for non-profit pregnancy care centers. It enables seamless appointment scheduling, volunteer management, and client communication with an emphasis on privacy, reliability, and offline-first data synchronization.

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
- PWA: Next.js (App Router), TypeScript, React; Workbox service worker for caching and Background Sync.
- Local data: PouchDB (IndexedDB) with outbox/inbox and conflict handling.
- Server API: Node (Express/Fastify), TypeScript. JWT + refresh in HttpOnly cookies, RBAC, multi-tenancy.
- Replication: Server-side proxy to CouchDB-compatible store with filtered replication by organization/site.
- Messaging: Twilio (SMS/Verify) via server-side jobs and webhooks; templates with variables.
- Embedding: Partner-friendly JS widget + public REST/GraphQL API with webhooks, theming, and CORS.
- Observability: Structured logs, metrics, tracing (OpenTelemetry), audit trails.

## Key Features
- Client management: Custom fields, intake forms, consent tracking, secure messaging.
- Staff & volunteer management: Skills, certifications, shifts, PTO, on-call, availability, trade approvals.
- Scheduling: Variable durations/buffers, block scheduling, group appointments, waitlists, eligibility rules, resource constraints, timezone/DST-safe recurrence, overbooking policies.
- Messaging (Twilio): Two-way SMS, reminders, confirmations, rescheduling links, phone verification, opt-in/out.
- Embeddable widget: Drop-in script with theming, i18n, accessibility; booking/search API; signed webhooks.
- Offline-first: Local store, queued mutations, background sync, deterministic conflict policy, audit logs.
- Customization: JSON Schema forms builder, versioning/migrations, field-level permissions, export/import.

## Security & Compliance
- Multi-tenant isolation and strict org/site scoping on all endpoints.
- RBAC with least-privilege roles; field-level permissions.
- PHI minimization, consent auditing, redaction in logs.
- Data retention, backups, restore drills; encrypted transport; secret management.

## Offline Sync Strategy
- PouchDB (IndexedDB) for local documents (`clients`, `resources`, `services`, `availability`, `bookings`, `messages`, `consents`, `audit_events`).
- Outbox for mutations with idempotent actions; inbox for server events.
- Background Sync via service worker, resumable replication checkpoints, filtered by org/site/scope.
- Conflict policy: Last-write-wins with domain merges (e.g., prevent double-booking in `bookings`), user-visible resolution UI, audit entries.

## Embeddable Booking & Public API
- Widget: `<script>` that mounts a booking UI into a container with `data-*` config for org/site/service/theme.
- API: REST/GraphQL endpoints to search availability, create/update/cancel bookings, waitlist operations, intake submissions.
- Webhooks: Signed event callbacks (booking lifecycle), retries and idempotency.
- Theming/branding: CSS variables, logo, colors, typography; i18n and accessibility.

## Twilio Flows
- Outbound: Message templates (versioned), personalization, schedules (72h/24h/2h), quiet hours.
- Inbound: Webhook ingestion, keyword handling (STOP/START/HELP), intent routing (reschedule/cancel).
- Verification: OTP via Twilio Verify; store verified status and consent.
- Status tracking: Delivery receipts, escalations, fallbacks (email), audit logs.

## Data Model (High-Level)
- Organization, Site, Program
- User (roles: Admin, Scheduler, Staff, Volunteer, Client)
- StaffProfile, VolunteerProfile (skills, certifications, preferences)
- Resource (rooms/equipment), Service (durations/buffers)
- Availability (recurrence + exceptions), Shift, PTO, TradeRequest
- Booking (single/group), Waitlist, Message, MessageTemplate
- Consent, AuditEvent, CustomFieldDefinition (JSON Schema)

## Repository Layout (Planned)
- apps/web: Next.js PWA (App Router), service worker, client portal
- apps/server: Node API (auth, scheduling, replication, Twilio, public API/webhooks)
- apps/admin: Admin UI for customization, RBAC, schedules, templates
- apps/embed: Demo host for embeddable widget
- packages/embed-widget: Partner drop-in JS widget (UMD/ESM), CDN-ready
- packages/ui: Shared UI components (scheduler grid, forms, dashboards)
- packages/core: Domain models, scheduling engine, rules/utilities
- packages/schema: JSON Schemas, Zod types, validation, migrations
- packages/pouch-sync: PouchDB setup, replication, outbox/inbox, conflict resolution
- packages/workflows: Twilio flows, reminder schedulers, intake/triage logic
- packages/observability: Logging, metrics, tracing setup
- packages/testing: Test helpers, fixtures, contract/e2e runners
- infra: Docker Compose for dev (CouchDB/Redis), CI/CD, secrets templates

## Environments & Prerequisites (Planned)
- Dev: Node 18+, pnpm, Docker (CouchDB, Redis), Twilio test credentials.
- Env: `.env` for web/server; secrets in OS/key vault for production.
- CI: Lint, type-check, tests, bundle budgets; canary releases for widget.

## Milestones & Success Criteria
1) Foundations & Tenancy: Auth (JWT+refresh), RBAC, org/site scoping; seed data; CI green.
2) Scheduling Basics: Availability search, variable durations/buffers, recurring + DST-safe rules; resource constraints.
3) Staff/Volunteer Ops: Profiles, availability/exceptions, shifts/PTO, trade approvals; audits.
4) Client Portal & Intake: Public booking, cancel/reschedule, waitlist, JSON Schema intake; e2e passing.
5) Embeddable Widget + Public API: `<script>` widget, REST/GraphQL with docs, webhooks with signed payloads, theming & CORS.
6) Twilio Messaging: Two-way SMS, reminders, verification, opt-in/out; delivery status; quiet hours.
7) Offline-First: PouchDB local store, outbox/inbox, background sync, conflicts resolved; visible sync status.
8) Integrations & Observability: ICS feeds, CSV export; logs/metrics/tracing; feature flags; blue/green deploy.

## Data Classification & Policy Defaults
- Sensitive vs normal data: define categories (pregnancy test results, appointment notes, counseling notes, abuse disclosures, medical referrals, verified phone/email vs general contact info).
- Minimum necessary access: restrict sensitive fields to roles; default-deny for high-risk fields.
- Audit logging: append-only audits for create/update/delete, consent changes, break-glass access; include actor, timestamp, before/after, reason.
- Retention/archival: per-tenant policies; default retention (e.g., 7 years) configurable; archival states; deletion workflows with approvals.
- Right to be forgotten: configurable per-tenant; ensure audit-safe redactions; immutable audit of deletion request.
- Break-glass access: emergency override with mandatory reason; auto-notify admins; prominent audit entries.
- Data exports: governed by role; watermarking and access logs; CSV exports with field-level permissions.
- PHI minimization: store only necessary; avoid PHI in SMS/email; redact logs by default.
- Consent lifecycle: explicit opt-in tracking with timestamp, source, form version; opt-out registry.
- Policy publication: surface org/site policies in admin; versioned; enforce via RBAC and server validation.

## Offline Device Security & Encryption
- Local DB: prefer encryption-at-rest (browser limits apply); where strong encryption is infeasible, use compensating controls.
- Compensating controls: short session TTLs; auto-lock on inactivity; device PIN guidance; shared-device mode for front desk.
- Remote wipe: server-initiated "wipe on next sync" flag; local "purge data" button for device owners.
- Offline session policy: configurable offline session duration; forced re-auth on reconnect if roles changed.
- PII minimization offline: limit offline replication by role (e.g., appointment snapshots for non-clinical roles). 
- Fast user switching: shared-device mode with quick lock/unlock and role-based views.

## Booking Consistency & Anti-Double-Booking Guarantees
- Source of truth: server is authoritative for final booking acceptance.
- Confirmation handshake: client creates booking (queued if offline) → server validates with atomic constraints → server commits and returns confirmation → webhooks/SMS sent → client updates local record.
- Hard constraints: uniqueness locks for (resource+time), (staff+time), capacity buckets; transactional validation on server.
- Waitlists & overbooking: explicit thresholds per service/site; server enforces caps; auto-promotion rules.
- Timezone/DST policy: store times in UTC; display in site/user TZ; generate recurrence in site TZ with DST-safe logic; document conversions and edge cases.

## Messaging Compliance & Registration (A2P/Consent)
- A2P 10DLC: define brand/campaign registration ownership, required data storage (brand, campaign IDs), onboarding steps.
- Consent capture: accepted opt-in methods (form checkbox, portal agreement, SMS "YES"); store timestamp, source, actor/IP, form/template version.
- Template governance: draft → approval workflow; per-org template library; versioning & rollback with audit.
- Quiet hours: configurable per org; suppress sends in defined windows; queue for next window.
- STOP/START/HELP handling: automatic opt-out/in responses; update consent registry; throttle abusive inbound traffic.
- Rate limiting: per-tenant messaging limits; webhook spam protection; inbound keyword throttling.
- Verification: Twilio Verify OTP; store verification status; re-verify policies.

## Public API Hardening (Auth/Rate limits/Bot protection)
- Auth modes: public availability search (rate-limited, no PII), booking with short-lived signed tokens, partner API keys with scoped permissions.
- CORS/CSP: explicit allowlists; widget is CSP-safe (no eval); content security guidelines for partners.
- Bot protection: optional hCaptcha/Turnstile, IP throttling, anomaly detection flags.
- API versioning: `/v1/...` with deprecation policy and changelog; contract tests for stability.
- Webhooks: HMAC-signed payloads; retries with backoff; idempotency keys; delivery status dashboards.

## Core Workflows (Happy paths + edge cases)
- New client intake → eligibility → booking → reminders → visit → follow-up: track consent and data minimization throughout; audit key actions.
- Walk-in conversion: front desk quickly creates appointment; eligibility & consent captured; notify assigned staff.
- Staff scheduling & resource assignment: create shifts; assign resources; resolve conflicts; publish schedules.
- Volunteer sign-up & approval: volunteers claim shifts; coordinator approves; messaging confirmations.
- Reschedule/cancel from SMS link: signed, time-bound links; server validates; updates booking and notifies parties.
- Multi-site org: client seen at alternate site; enforce cross-site permissions; reconcile site-specific availability.

## Reporting & Exports
- Dashboards: counts by site/service/date range; waitlist churn; no-shows; messaging deliverability.
- CSV exports: governed by role; template-based; de-identification options.
- Audit export: compliance review bundles; filter by time window and actor.
- Calendar feeds (ICS): per user/resource; secret token URLs; permissioned subscriptions.

## Backups / DR / Tenant Offboarding
- RPO/RTO: define targets (e.g., RPO ≤ 24h, RTO ≤ 4h) and review quarterly.
- Backups: daily snapshots; encrypted; periodic restore drills; compaction policies for CouchDB.
- Tenant export: full tenant data export with schemas; audit and messaging logs included.
- Tenant delete: retention rules; phased deletion; audit of requests; redaction where appropriate.
- Restore verification: cadence (e.g., monthly); documented playbooks.

## Testing Strategy (unit/contract/e2e/offline/security)
- Unit tests: scheduling engine with property-based tests (timezones/DST, buffers, capacity).
- Contract tests: widget ↔ public API; webhook signature verification.
- E2E: booking flow, SMS reminders, reschedule/cancel via link; admin customization.
- Offline simulation: network drop, replay outbox, induced conflicts; ensure reconciliation.
- Security tests: dependency scanning, SAST, rate-limit/bot protection checks.

## MVP Definition
- Thin slice: Org/site setup → services/resources → staff availability → public booking → confirmation SMS → staff schedule view → cancel/reschedule → audit log.
- Exit criteria: All steps function online/offline; server authoritative commits; audits present; Twilio flows pass tests; widget embeds with basic theming.

## RBAC Matrix (Initial)
- Roles: Admin, Scheduler, Staff, Volunteer, Client.
- Admin: full tenant admin, policy/config, forms, templates, users, exports, webhooks.
- Scheduler: manage availability, bookings, waitlists, resources; view client minimal data as policy allows.
- Staff: view assigned bookings/clients; add case notes; limited booking operations; messaging within policy.
- Volunteer: view assigned shifts; limited client exposure; messaging constrained; hour logging.
- Client: portal access; self-service booking/reschedule/cancel; messaging consent.
- Field-level permissions: sensitive fields visible/editable only to Admin/Staff (policy-driven).
- Site scoping: users bound to sites/programs; cross-site access requires explicit grants.

## API Contracts Overview (Draft)
- REST base: `/v1`
- Availability: `GET /v1/availability?org=...&site=...&service=...&from=...&to=...`
- Book: `POST /v1/bookings` (body: org/site/service, client, slot, metadata) → returns booking with status `confirmed|pending`.
- Modify: `PATCH /v1/bookings/{id}` (reschedule, cancel, notes)
- Waitlist: `POST /v1/waitlist` / `DELETE /v1/waitlist/{id}`
- Intake: `POST /v1/intake` (JSON Schema payload + version)
- Clients: `GET/POST/PATCH /v1/clients`
- Shifts: `GET/POST/PATCH /v1/shifts`
- Resources/Services: `GET/POST/PATCH /v1/resources`, `/v1/services`
- Messaging: `POST /v1/messages/send` (templateId, vars, recipients)
- Webhooks: `POST /v1/webhooks/{event}` (incoming Twilio, partner callbacks) with HMAC signature
- Auth: `POST /v1/auth/login`, `POST /v1/auth/refresh`, `POST /v1/auth/logout`
- Widget token: `POST /v1/embed/token` (short-lived booking token scoped to org/site/service)
- GraphQL: `/v1/graphql` for partner integrations (optional; mirrors core entities)

## Service Worker & Caching Strategy
- Precache: app shell, core routes, static assets, widget script (versioned), i18n bundles.
- Runtime caches:
  - GET APIs: stale-while-revalidate with TTL caps.
  - POST/PUT/PATCH/DELETE: network-only with Background Sync queue; idempotent actions.
- Sync cadence: backoff with jitter; pause during quiet hours for messaging.
- Offline fallbacks: dedicated offline route with essential actions (view schedule, create pending booking).
- Cache busting: versioned assets; SW update prompts; safe rollover.

## Deployment & Environments
- Envs: dev, staging, prod; per-tenant feature flags.
- Server: Fastify/Express on Node 18+; Docker images; deploy via Render/Railway/Azure; autoscaling; HTTPS enforced.
- Data: CouchDB (managed or self-hosted); Redis for queues; backups automated.
- Widget: CDN-hosted (Cloudflare/Akamai) with versioned filenames; CSP-safe headers.
- Secrets: managed via platform vault; `.env` only for local dev.
- CI/CD: lint, type-check, tests, build; canary releases for widget and API; blue/green deploys for server.

## Staff Flexible Scheduling Details
- Shifts: variable durations; split shifts; overlapping support; soft/hard constraints per role.
- On-call: windows with escalation rules; paging via SMS; assignment rotation.
- Overrides: per-day exceptions; blackout dates; PTO/leave integration; approvals workflow.
- Load balancing: distribute bookings across staff; fairness and capacity rules.
- Overtime policies: warnings and approvals when exceeding thresholds.

## Volunteer Management Details
- Sign-up windows: volunteers claim open shifts; coordinator approval queues.
- Credential tracking: certifications, background checks, expirations; reminders.
- Training modules: record completion; eligibility gates for certain services.
- Hour logging: per-shift clock-in/out or auto-log; export for reporting.
- Messaging: broadcast to volunteer groups; shift reminders; opt-in compliance.

## Internationalization & Accessibility
- Locales: configurable per tenant; language packs; date/time localization.
- Accessibility: WCAG 2.2 AA targets; keyboard navigation; high-contrast mode; screen reader labels.
- RTL support: layouts and components adapt to RTL languages.

## Performance Budgets
- PWA shell ≤ 200KB gzip initial; critical CSS inlined; lazy-load non-critical bundles.
- TTI ≤ 3s on mid-tier devices; cache-first for shell.
- API response budgets: availability search ≤ 300ms p95 (staging target); pagination enforced.

## Architecture Decision Records (ADR)
- Maintain `/docs/adr/` with numbered decisions.
- Template: context, decision, alternatives, consequences.
- Initial ADRs: Next.js App Router; Fastify vs Express; PouchDB+CouchDB sync; A2P registration ownership; widget delivery strategy.

## Partner Integration Guide (Outline)
- Embedding: script include, container setup, data attributes, init API.
- CSP guidance: required directives; example configurations.
- Auth: short-lived booking tokens; token issuance; scopes and expiries.
- Webhooks: event types, payload schemas, signature verification examples.
- Theming: CSS variables; theme packs; logo and brand assets.
- Troubleshooting: rate limits, bot protection, common errors.

## Data Migration Strategy
- Schema versioning: JSON Schema + UI Schema; migrations with safe roll-forward/back.
- Compatibility: client enforces version gates; warns/admins when mismatch.
- Backfill jobs: server tasks for evolving fields; audit changes.

## Analytics & KPIs
- Core: bookings created/confirmed/canceled; show rate; waitlist churn; message deliverability; volunteer hours; staff utilization.
- Per-tenant dashboards; exportable reports; anomaly alerts.

## Operations & Support
- Runbooks: incident handling, webhook retries, queue congestion, backup/restore.
- SLAs: response targets for critical endpoints; maintenance windows.
- Escalation: on-call rotations; contact points; status page.

## Open Questions (To Align Before Scaffolding)
- Next.js choice: App Router vs Pages + `next-pwa`? (App Router + custom Workbox recommended.)
- Server framework preference: Fastify vs Express? (Fastify recommended for performance.)
- CouchDB hosting strategy and per-tenant database vs partitions?
- Widget CDN and CSP constraints for partner sites?
- Minimum viable scheduling policies (overbooking, waitlist promotion) for v1?
- Required locales and accessibility targets.

## Next Steps
- Confirm open questions and priorities with stakeholders.
- Lock tech choices (Next.js App Router, Fastify, CouchDB proxy).
- Scaffold monorepo and minimal stubs (web app shell, server health, schemas package).
- Draft API contracts for booking/search/webhooks and widget init options.

---

This README is the master guide. Once aligned, we’ll scaffold the repository to this plan and iterate feature by feature with tests and observability.
