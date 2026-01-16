# SheduleRight By James Knox — Master Plan & Implementation Guide

SheduleRight is an offline-first PWA and Node API for non-profit Pregnancy Care Centers to manage clients, staff, volunteers, scheduling, and messaging (Twilio), with an embeddable client-facing booking widget and a public API. This document aligns vision, scope, architecture, milestones, and next steps before we scaffold code.

## Vision & Goals
- Empower centers offering free services to manage client care with privacy, consent, and flexibility.
- Offline-first operation with seamless online sync across devices/sites.
- Highly customizable data fields and forms driven by JSON Schema.
- Modern scheduling with variable durations, buffers, capacity, recurring rules, and exceptions.
- Two-way messaging and reminders via Twilio with full opt-in/out compliance.
- Embeddable booking widget and public API for partner websites.
- Multi-tenant, secure, auditable, and easy to operate.

## Architecture Overview
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
