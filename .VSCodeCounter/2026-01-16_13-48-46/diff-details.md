# Diff Details

Date : 2026-01-16 13:48:46

Directory c:\\Users\\James\\Documents\\GitHub\\scheduleright---NonProfit-Sheduling-Software

Total : 42 files,  5401 codes, 86 comments, 1261 blanks, all 6748 lines

[Summary](results.md) / [Details](details.md) / [Diff Summary](diff.md) / Diff Details

## Files
| filename | language | code | comment | blank | total |
| :--- | :--- | ---: | ---: | ---: | ---: |
| [COMPLETION\_REPORT.md](/COMPLETION_REPORT.md) | Markdown | 336 | 0 | 94 | 430 |
| [FIXES\_SESSION.md](/FIXES_SESSION.md) | Markdown | 136 | 0 | 45 | 181 |
| [IMPLEMENTATION\_PLAN.md](/IMPLEMENTATION_PLAN.md) | Markdown | 202 | 0 | 52 | 254 |
| [MONITORING\_OBSERVABILITY.md](/MONITORING_OBSERVABILITY.md) | Markdown | 699 | 0 | 158 | 857 |
| [NEXT\_STEPS.md](/NEXT_STEPS.md) | Markdown | 288 | 0 | 75 | 363 |
| [PRODUCTION\_HARDENING.md](/PRODUCTION_HARDENING.md) | Markdown | 690 | 0 | 164 | 854 |
| [PROGRESS\_REPORT.md](/PROGRESS_REPORT.md) | Markdown | 219 | 0 | 63 | 282 |
| [PROJECT\_COMPLETION.md](/PROJECT_COMPLETION.md) | Markdown | 504 | 0 | 129 | 633 |
| [README.md](/README.md) | Markdown | 199 | 0 | 91 | 290 |
| [SESSION\_SUMMARY.md](/SESSION_SUMMARY.md) | Markdown | 149 | 0 | 47 | 196 |
| [SESSION\_SUMMARY\_BOOKINGS.md](/SESSION_SUMMARY_BOOKINGS.md) | Markdown | 296 | 0 | 79 | 375 |
| [TODO\_FROM\_SERVER\_LOG.md](/TODO_FROM_SERVER_LOG.md) | Markdown | 33 | 0 | 10 | 43 |
| [TWILIO\_SMS\_GUIDE.md](/TWILIO_SMS_GUIDE.md) | Markdown | 299 | 0 | 83 | 382 |
| [apps/server/package.json](/apps/server/package.json) | JSON | 2 | 0 | 0 | 2 |
| [apps/server/src/db/adapter.ts](/apps/server/src/db/adapter.ts) | TypeScript | 2 | 0 | 0 | 2 |
| [apps/server/src/db/indexes.ts](/apps/server/src/db/indexes.ts) | TypeScript | 5 | 1 | -1 | 5 |
| [apps/server/src/db/mysql/migrations/002\_users\_orgs.sql](/apps/server/src/db/mysql/migrations/002_users_orgs.sql) | MS SQL | -18 | 2 | 0 | -16 |
| [apps/server/src/db/mysql/migrations/003\_volunteers\_shifts.sql](/apps/server/src/db/mysql/migrations/003_volunteers_shifts.sql) | MS SQL | 47 | 1 | 4 | 52 |
| [apps/server/src/db/mysql/migrations/004\_seed\_test\_data.sql](/apps/server/src/db/mysql/migrations/004_seed_test_data.sql) | MS SQL | 28 | 5 | 4 | 37 |
| [apps/server/src/index.ts](/apps/server/src/index.ts) | TypeScript | 9 | 2 | 2 | 13 |
| [apps/server/src/routes/bootstrap.ts](/apps/server/src/routes/bootstrap.ts) | TypeScript | 23 | 2 | 3 | 28 |
| [apps/server/src/routes/messaging.ts](/apps/server/src/routes/messaging.ts) | TypeScript | 179 | 0 | 20 | 199 |
| [apps/server/src/routes/reminders.ts](/apps/server/src/routes/reminders.ts) | TypeScript | 105 | 18 | 10 | 133 |
| [apps/server/src/services/booking.service.ts](/apps/server/src/services/booking.service.ts) | TypeScript | 3 | 0 | 0 | 3 |
| [apps/server/src/services/messaging.service.ts](/apps/server/src/services/messaging.service.ts) | TypeScript | 91 | 0 | 12 | 103 |
| [apps/server/src/services/org.service.ts](/apps/server/src/services/org.service.ts) | TypeScript | 1 | 0 | 0 | 1 |
| [apps/server/src/services/reminder.service.ts](/apps/server/src/services/reminder.service.ts) | TypeScript | 82 | 0 | 16 | 98 |
| [apps/web/app/(dashboard)/availability/page.tsx](/apps/web/app/(dashboard)/availability/page.tsx) | TypeScript JSX | 335 | 6 | 32 | 373 |
| [apps/web/app/(dashboard)/orgs/\[orgId\]/page.tsx](/apps/web/app/(dashboard)/orgs/%5BorgId%5D/page.tsx) | TypeScript JSX | 10 | 0 | 2 | 12 |
| [apps/web/app/(dashboard)/orgs/\[orgId\]/sites/\[siteId\]/page.tsx](/apps/web/app/(dashboard)/orgs/%5BorgId%5D/sites/%5BsiteId%5D/page.tsx) | TypeScript JSX | 71 | 0 | 9 | 80 |
| [apps/web/app/(dashboard)/reminders/page.tsx](/apps/web/app/(dashboard)/reminders/page.tsx) | TypeScript JSX | 61 | 1 | 5 | 67 |
| [apps/web/app/layout.tsx](/apps/web/app/layout.tsx) | TypeScript JSX | 4 | 0 | 1 | 5 |
| [apps/web/app/providers.tsx](/apps/web/app/providers.tsx) | TypeScript JSX | 5 | 0 | 0 | 5 |
| [apps/web/lib/hooks/useApi.ts](/apps/web/lib/hooks/useApi.ts) | TypeScript | 5 | 0 | 1 | 6 |
| [apps/web/lib/hooks/useAuth.ts](/apps/web/lib/hooks/useAuth.ts) | TypeScript | 47 | 7 | 10 | 64 |
| [apps/web/lib/hooks/useData.ts](/apps/web/lib/hooks/useData.ts) | TypeScript | 186 | 33 | 22 | 241 |
| [apps/web/lib/hooks/useSite.ts](/apps/web/lib/hooks/useSite.ts) | TypeScript | 48 | 7 | 12 | 67 |
| [apps/web/middleware.ts](/apps/web/middleware.ts) | TypeScript | 12 | 0 | 5 | 17 |
| [apps/web/next.config.mjs](/apps/web/next.config.mjs) | JavaScript | 18 | 1 | 2 | 21 |
| [apps/web/public/manifest.json](/apps/web/public/manifest.json) | JSON | -12 | 0 | 0 | -12 |
| [apps/web/tsconfig.json](/apps/web/tsconfig.json) | JSON with Comments | 1 | 0 | 0 | 1 |
| [package.json](/package.json) | JSON | 1 | 0 | 0 | 1 |

[Summary](results.md) / [Details](details.md) / [Diff Summary](diff.md) / Diff Details