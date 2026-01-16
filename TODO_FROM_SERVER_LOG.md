# TODOs from Server Log Review

Date: 2026-01-16

## Must Fix (from logs)
- [x] Fix bookings API base path
   - Frontend requests `GET /bookings/me` without `/api/v1`.
   - Align API client/base URL so `useMyBookings()` hits `/api/v1/bookings/me`.

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
   - [ ] Drag/drop ordering per entity type section
- [x] UI: Client profile integration (Phase 1)
   - [x] Render custom fields with correct controls
   - [x] Inline edit + save (bulk upsert)
   - [x] Show read-only fields by visibility
- [ ] UI: Additional entities (Phase 2)
   - [ ] Appointments
   - [ ] Staff/Volunteers
   - [ ] Sites/Locations
   - [ ] Organizations
   - [ ] Programs/Resources
- [ ] Auditing & permissions
   - [ ] Log changes to property definitions + values
   - [ ] Enforce visibility (public vs staff vs admin)
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
