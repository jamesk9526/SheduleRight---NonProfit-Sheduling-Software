# TODOs from Server Log Review

Date: 2026-01-16

## Must Fix (from logs)
- [x] Fix bookings API base path
   - Frontend requests `GET /bookings/me` without `/api/v1`.
   - Align API client/base URL so `useMyBookings()` hits `/api/v1/bookings/me`.

- [x] Org detail page runtime crash
   - TypeError: Cannot read properties of undefined (reading 'name') in org detail route
   - Observed while navigating dashboard orgs (stack points to page.tsx around org name)
   - Fixed by adding optional chaining to org?.name

- [x] Help desk / global search
   - Create `/help` page with global search; pre-index docs URLs, API endpoints, embed guide, properties/branding/messaging pages
   - Show context cards with deep links: API base, embed token docs, branding settings, login branding orgId parameter, properties routes
   - Expose quick actions in dashboard header and login footer; consider keyboard shortcut (`?` or `Ctrl+K`) for a searchable command palette backed by same index
   - Added help page, search index, header/login triggers, keyboard shortcuts (?/Ctrl+K), and smoke tests

- [x] Enforce property visibility on reads
   - Filter property types and values by `visibility` (public/staff/admin) for non-admin users

- [x] Align dashboard bookings routes
   - 404s for `/dashboard/bookings/browse`, `/dashboard/bookings/new`, `/dashboard/bookings/my`.
   - Match Next.js routes with navigation links.

- [x] Add org settings page
   - `/dashboard/orgs/[orgId]/settings` returns 404.
   - Create settings page or remove link.

- [x] Fix site details route
   - `/orgs/[orgId]/sites/site:...` returns 404.
   - Normalize site route param format and add page if missing.

- [x] Handle dotfile probe requests
   - Requests to `/.env` and `/.git/config` should be blocked or safely handled.

- [x] Update Fastify deprecation
   - Replace `request.routerPath` with `request.routeOptions.url`.

## Features Not Done Yet (talked about)
- [ ] Twilio credentials setup
- [x] Reminder scheduler job
- [x] Client messaging endpoints
- [x] Messaging UI + hooks
- [x] Availability management UI
- [x] Multi-site selector context
- [x] Embed widget + public API

## Nice-to-Haves
- [x] Org branding
- [ ] Subdomain routing
- [ ] Notification preferences
- [ ] Client management tools
- [ ] Custom client fields (configurable client properties)

## Custom Properties / Field Library (Detailed Plan)
- [x] Data model: PropertyType
   - [x] Fields: property_id (stable key), label, description/helpText, data_type, required, defaultValue
   - [x] Validation config: min/max, regex/pattern, enumOptions, allowMultiple
   - [x] UI config: placeholder, section, order, display format
   - [x] Visibility: public/staff/admin, readOnly flag
   - [x] Scope: org_id (per-org) + isGlobal template flag
   - [x] Applies-to: list of entity types (client, appointment, staff, volunteer, site, org, program, resource)
- [x] Data model: PropertyValue
   - [x] Fields: entity_type, entity_id, property_id, value (JSON), org_id
   - [x] Metadata: createdAt, updatedAt, createdBy, updatedBy
- [ ] Validation layer
   - [x] Central validator for value by data_type + rules
   - [x] Reject unknown property_id / entity_type mismatches
   - [x] Enforce required fields and visibility permissions
- [x] Database support (CouchDB + MySQL)
   - [x] Add indexes for org_id, entity_type, entity_id, property_id
   - [x] Update MySQL adapter mapping for new index columns
   - [x] Add MySQL schema/migration for documents indexes if needed
- [x] API: PropertyType management
   - [x] GET /api/v1/properties (list by org)
   - [x] POST /api/v1/properties (create)
   - [x] PUT /api/v1/properties/:id (update)
   - [x] DELETE /api/v1/properties/:id (soft delete)
   - [x] Role guard: ADMIN/STAFF create/update, ADMIN delete
- [x] API: PropertyValue management
   - [x] GET /api/v1/entities/:entityType/:entityId/properties
   - [x] PUT /api/v1/entities/:entityType/:entityId/properties (bulk upsert)
   - [x] DELETE /api/v1/entities/:entityType/:entityId/properties/:propertyId
   - [x] Role guard: STAFF/ADMIN edit, CLIENT read own if allowed
- [x] UI: Admin Field Library
   - [x] List properties + filters by entity type + visibility
   - [x] Create/edit property modal (data_type, validation, applies_to)
   - [x] Preview rendering per data_type
   - [x] Drag/drop ordering per entity type section
- [x] UI: Client profile integration (Phase 1)
   - [x] Render custom fields with correct controls
   - [x] Inline edit + save (bulk upsert)
   - [x] Show read-only fields by visibility
- [ ] UI: Additional entities (Phase 2)
   - [x] Appointments
   - [x] Staff/Volunteers
   - [x] Sites/Locations
   - [x] Organizations
   - [x] Programs/Resources

## UI Usability Pass (Iterative)
- [x] UX polish for Field Library (filter clarity, empty states, help text)
- [x] UX polish for Client custom fields (labels, spacing, save feedback)
- [x] UX polish for Volunteer custom fields (selection clarity, save feedback)
- [x] UX polish for Site custom fields (selection clarity, save feedback)
- [x] UX polish for Organization custom fields (helper text, required/admin indicators, save feedback)
- [x] UX polish for Programs/Resources custom fields (entity selector clarity, save feedback)
- [ ] Auditing & permissions
   - [x] Log changes to property definitions + values
   - [ ] Enforce visibility (public vs staff vs admin)
- [ ] Login page branding polish (pull org branding, apply colors/logo, branded gradients)
- [ ] Help Desk / searchable guide
   - [ ] Searchable help desk UI with indexed URLs to docs/tools
   - [ ] Curated links for booking API, embed, properties, branding, messaging
   - [ ] Surface in dashboard header and login page
- [ ] Import/Export
   - [ ] Export property definitions + values (CSV/JSON)
   - [ ] Import definitions with conflict resolution
- [ ] Defaults & templating
   - [ ] Support org templates and cloning
   - [ ] Apply default values on entity creation

## Embed Code Generator (Admin)
- [x] Admin UI to generate embed snippet (script + container)
- [x] Support per-site embed configs (siteId selection)
- [x] Allow configuration options: theme colors, button label
- [x] Issue public embed token to restrict access
- [x] Store embed configurations server-side for reuse
- [x] Add API to fetch embed config by token
- [x] Update embed widget to accept token/config and load availability from public API
- [x] Add edit/archive controls + audit trail UI
- [x] Enforce domain allowlist when no Origin/Referer
- [x] Add locale/timezone/default service options
- [x] Document how to embed on main site and other pages

## Production Hardening
- [x] Production hardening sweep
