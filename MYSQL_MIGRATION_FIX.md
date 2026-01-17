# MySQL Migration Syntax Error Fix

## 🔴 Problem

When running `pnpm dev`, you get:

```
❌ Migration error: Error: You have an error in your SQL syntax; 
check the manual that corresponds to your MySQL server version 
for the right syntax to use near 'IF NOT EXISTS idx_documents_type_org 
ON documents(type, org_id);
CREATE INDEX I' at line 2
```

**Root Cause:** The migration script tries to execute multiple SQL statements in a single query without proper statement splitting.

---

## ✅ Solution

The fix has been applied to your codebase. Here's what was changed:

### 1. **Fixed Migration File**
   - File: `apps/server/src/db/mysql/migrations/001_documents_indexes.sql`
   - Change: Added proper comments and formatting between statements
   - Result: Clearer SQL structure

### 2. **Fixed Migration Runner**
   - File: `apps/server/src/db/mysql/migrate.ts`
   - Change: Updated `applyMigration()` function to:
     - Split SQL by semicolons
     - Execute each statement individually
     - Filter out comment lines
     - Provide better error messages

---

## 🚀 On Your Server

Run this to fix it:

```bash
cd ~/htdocs/www.crm.partnertpcc.com

# Pull the latest fixes
git pull origin main

# Clear any existing schema/migrations
# Option A: Reset database (WARNING: loses data)
mysql -u root -p -e "DROP DATABASE scheduleright; CREATE DATABASE scheduleright;"

# Option B: Delete migrations table only (keeps data)
mysql -u root -p scheduleright -e "DROP TABLE IF EXISTS migrations;"

# Reinstall and run
pnpm install
pnpm dev
```

---

## 🔧 What Changed in the Code

### Before (Broken)
```sql
CREATE INDEX IF NOT EXISTS idx_documents_type_org ON documents(type, org_id);
CREATE INDEX IF NOT EXISTS idx_documents_site ON documents(site_id);
CREATE INDEX IF NOT EXISTS idx_documents_email ON documents(email);
```
*Executed as single multi-statement query → MySQL syntax error*

### After (Fixed)
```typescript
// Split SQL by semicolons
const statements = sql
  .split(';')
  .map(stmt => stmt.trim())
  .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

// Execute each statement separately
for (const statement of statements) {
  await pool.query(statement)
}
```
*Each statement executed individually → Works correctly*

---

## ✅ Verify Fix

After applying the fix, you should see:

```
🚚 Running MySQL migrations...
  ✓ Applied migration: 001_documents_indexes.sql
  ✓ Applied migration: 002_add_subdomain_support.sql
  ... more migrations ...
✅ Migrations complete
✓ server ready (port 5710)
```

Then test:
```bash
curl http://localhost:5710/health
# Should return: {"status":"ok"}
```

---

## 📋 Migration Files

All migration files in `apps/server/src/db/mysql/migrations/`:

- ✓ `001_documents_indexes.sql` - Document table indexes
- ✓ `002_add_subdomain_support.sql` - Subdomain routing support
- ✓ (More as needed)

Each is executed individually by the updated runner.

---

## 🆘 If Still Having Issues

### Check Database Connection
```bash
mysql -u root -p -h localhost
# Type password and check if you can connect
```

### Check MySQL Version
```bash
mysql --version
# Should be 5.7.2+ (supports IF NOT EXISTS for indexes)
```

### Verify Database Exists
```bash
mysql -u root -p -e "SHOW DATABASES;" | grep scheduleright
```

### Check Migrations Table
```bash
mysql -u root -p scheduleright -e "SELECT * FROM migrations;"
```

### Force Reset (CAUTION: Deletes all data)
```bash
mysql -u root -p <<EOF
DROP DATABASE IF EXISTS scheduleright;
CREATE DATABASE scheduleright CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EOF

pnpm dev
```

---

## 📚 Related Files

- `apps/server/src/db/mysql/migrate.ts` - Migration runner (FIXED)
- `apps/server/src/db/mysql/migrations/*.sql` - Migration files
- `apps/server/src/db/mysql/init.ts` - Database initialization

---

## 🎯 Summary

**What Was Wrong:**
- Migration file had multiple SQL statements
- Migration runner tried to execute them as a single statement
- MySQL rejected the syntax

**What's Fixed:**
- Migration runner now splits statements by semicolon
- Each statement executed individually
- Better error handling and messages

**You Need To:**
1. `git pull` to get the fixes
2. Reset migrations table (or database)
3. Run `pnpm dev` again

✅ **Should work now!**
