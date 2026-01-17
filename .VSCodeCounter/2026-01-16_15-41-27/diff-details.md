# Diff Details

Date : 2026-01-16 15:41:27

Directory c:\\Users\\James\\Documents\\GitHub\\scheduleright---NonProfit-Sheduling-Software

Total : 42 files,  4710 codes, 19 comments, 384 blanks, all 5113 lines

[Summary](results.md) / [Details](details.md) / [Diff Summary](diff.md) / Diff Details

## Files
| filename | language | code | comment | blank | total |
| :--- | :--- | ---: | ---: | ---: | ---: |
| [README.md](/README.md) | Markdown | 26 | 0 | 7 | 33 |
| [TODO\_FROM\_SERVER\_LOG.md](/TODO_FROM_SERVER_LOG.md) | Markdown | 74 | 0 | 4 | 78 |
| [apps/embed/app/page.tsx](/apps/embed/app/page.tsx) | TypeScript JSX | 244 | 0 | 24 | 268 |
| [apps/server/src/config.ts](/apps/server/src/config.ts) | TypeScript | 7 | 0 | 1 | 8 |
| [apps/server/src/db/adapter.ts](/apps/server/src/db/adapter.ts) | TypeScript | 15 | 0 | 0 | 15 |
| [apps/server/src/db/indexes.ts](/apps/server/src/db/indexes.ts) | TypeScript | 15 | 1 | 1 | 17 |
| [apps/server/src/db/mysql/migrations/005\_property\_fields.sql](/apps/server/src/db/mysql/migrations/005_property_fields.sql) | MS SQL | 6 | 0 | 2 | 8 |
| [apps/server/src/db/mysql/schema.sql](/apps/server/src/db/mysql/schema.sql) | MS SQL | 5 | 0 | 0 | 5 |
| [apps/server/src/index.ts](/apps/server/src/index.ts) | TypeScript | 15 | 5 | 5 | 25 |
| [apps/server/src/routes/clients.ts](/apps/server/src/routes/clients.ts) | TypeScript | 128 | 0 | 18 | 146 |
| [apps/server/src/routes/embed-configs.ts](/apps/server/src/routes/embed-configs.ts) | TypeScript | 193 | 0 | 20 | 213 |
| [apps/server/src/routes/embed-public.ts](/apps/server/src/routes/embed-public.ts) | TypeScript | 53 | 0 | 5 | 58 |
| [apps/server/src/routes/properties.ts](/apps/server/src/routes/properties.ts) | TypeScript | 256 | 0 | 29 | 285 |
| [apps/server/src/routes/public.ts](/apps/server/src/routes/public.ts) | TypeScript | 215 | 0 | 24 | 239 |
| [apps/server/src/services/audit.service.ts](/apps/server/src/services/audit.service.ts) | TypeScript | 3 | 1 | 1 | 5 |
| [apps/server/src/services/booking.service.ts](/apps/server/src/services/booking.service.ts) | TypeScript | 31 | 6 | 4 | 41 |
| [apps/server/src/services/embed-config.service.ts](/apps/server/src/services/embed-config.service.ts) | TypeScript | 94 | 0 | 15 | 109 |
| [apps/server/src/services/property.service.ts](/apps/server/src/services/property.service.ts) | TypeScript | 269 | 0 | 29 | 298 |
| [apps/web/app/(dashboard)/availability/page.tsx](/apps/web/app/(dashboard)/availability/page.tsx) | TypeScript JSX | 23 | 0 | 2 | 25 |
| [apps/web/app/(dashboard)/bookings/\[bookingId\]/messages/page.tsx](/apps/web/app/(dashboard)/bookings/%5BbookingId%5D/messages/page.tsx) | TypeScript JSX | 97 | 0 | 13 | 110 |
| [apps/web/app/(dashboard)/bookings/\[bookingId\]/page.tsx](/apps/web/app/(dashboard)/bookings/%5BbookingId%5D/page.tsx) | TypeScript JSX | 196 | 1 | 12 | 209 |
| [apps/web/app/(dashboard)/bookings/browse/page.tsx](/apps/web/app/(dashboard)/bookings/browse/page.tsx) | TypeScript JSX | 2 | 0 | 0 | 2 |
| [apps/web/app/(dashboard)/bookings/manage/page.tsx](/apps/web/app/(dashboard)/bookings/manage/page.tsx) | TypeScript JSX | -1 | 0 | 0 | -1 |
| [apps/web/app/(dashboard)/bookings/new/page.tsx](/apps/web/app/(dashboard)/bookings/new/page.tsx) | TypeScript JSX | 1 | 0 | 0 | 1 |
| [apps/web/app/(dashboard)/bookings/page.tsx](/apps/web/app/(dashboard)/bookings/page.tsx) | TypeScript JSX | 46 | 0 | 3 | 49 |
| [apps/web/app/(dashboard)/clients/\[email\]/page.tsx](/apps/web/app/(dashboard)/clients/%5Bemail%5D/page.tsx) | TypeScript JSX | 358 | 0 | 24 | 382 |
| [apps/web/app/(dashboard)/clients/page.tsx](/apps/web/app/(dashboard)/clients/page.tsx) | TypeScript JSX | 134 | 0 | 12 | 146 |
| [apps/web/app/(dashboard)/embed/page.tsx](/apps/web/app/(dashboard)/embed/page.tsx) | TypeScript JSX | 525 | 0 | 21 | 546 |
| [apps/web/app/(dashboard)/layout.tsx](/apps/web/app/(dashboard)/layout.tsx) | TypeScript JSX | 64 | 0 | 7 | 71 |
| [apps/web/app/(dashboard)/orgs/\[orgId\]/page.tsx](/apps/web/app/(dashboard)/orgs/%5BorgId%5D/page.tsx) | TypeScript JSX | 189 | 0 | 13 | 202 |
| [apps/web/app/(dashboard)/orgs/\[orgId\]/settings/page.tsx](/apps/web/app/(dashboard)/orgs/%5BorgId%5D/settings/page.tsx) | TypeScript JSX | 8 | 0 | 1 | 9 |
| [apps/web/app/(dashboard)/orgs/\[orgId\]/sites/\[siteId\]/page.tsx](/apps/web/app/(dashboard)/orgs/%5BorgId%5D/sites/%5BsiteId%5D/page.tsx) | TypeScript JSX | 229 | 0 | 13 | 242 |
| [apps/web/app/(dashboard)/orgs/new/page.tsx](/apps/web/app/(dashboard)/orgs/new/page.tsx) | TypeScript JSX | 2 | 0 | 0 | 2 |
| [apps/web/app/(dashboard)/profile/page.tsx](/apps/web/app/(dashboard)/profile/page.tsx) | TypeScript JSX | 3 | 0 | 0 | 3 |
| [apps/web/app/(dashboard)/properties/page.tsx](/apps/web/app/(dashboard)/properties/page.tsx) | TypeScript JSX | 633 | 0 | 26 | 659 |
| [apps/web/app/(dashboard)/reminders/page.tsx](/apps/web/app/(dashboard)/reminders/page.tsx) | TypeScript JSX | 3 | 0 | 0 | 3 |
| [apps/web/app/(dashboard)/resources/page.tsx](/apps/web/app/(dashboard)/resources/page.tsx) | TypeScript JSX | 253 | 0 | 23 | 276 |
| [apps/web/app/(dashboard)/volunteers/page.tsx](/apps/web/app/(dashboard)/volunteers/page.tsx) | TypeScript JSX | 219 | 0 | 13 | 232 |
| [apps/web/app/(dashboard)/volunteers/shifts/page.tsx](/apps/web/app/(dashboard)/volunteers/shifts/page.tsx) | TypeScript JSX | 24 | 0 | 0 | 24 |
| [apps/web/app/layout.tsx](/apps/web/app/layout.tsx) | TypeScript JSX | -1 | 0 | 0 | -1 |
| [apps/web/lib/hooks/useData.ts](/apps/web/lib/hooks/useData.ts) | TypeScript | 26 | 3 | 2 | 31 |
| [test-sms-endpoints.ps1](/test-sms-endpoints.ps1) | PowerShell | 28 | 2 | 10 | 40 |

[Summary](results.md) / [Details](details.md) / [Diff Summary](diff.md) / Diff Details