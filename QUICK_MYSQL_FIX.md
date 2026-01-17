# 🚨 Quick MySQL Migration Fix

## Your Error

```
❌ Migration error: Error: You have an error in your SQL syntax
near 'IF NOT EXISTS idx_documents_type_org ON documents(type, org_id);
CREATE INDEX I' at line 2
```

## Fix (2 Steps)

### Step 1: Pull Latest Code
```bash
cd ~/htdocs/www.crm.partnertpcc.com
git pull origin main
```

### Step 2: Reset Migrations & Retry
```bash
# Option A: Keep database, reset migrations table only
mysql -u root -p scheduleright -e "DROP TABLE IF EXISTS migrations;"
pnpm dev

# Option B: Complete reset (deletes all data)
mysql -u root -p -e "DROP DATABASE scheduleright; CREATE DATABASE scheduleright;"
pnpm dev
```

---

## What Was Fixed

✅ `migrate.ts` - Now splits and executes SQL statements properly  
✅ `001_documents_indexes.sql` - Better formatted with comments

---

## Expected Result

```
🚚 Running MySQL migrations...
  ✓ Applied migration: 001_documents_indexes.sql
✅ Migrations complete
✓ server ready (port 5710)
```

---

**See [MYSQL_MIGRATION_FIX.md](MYSQL_MIGRATION_FIX.md) for detailed explanation**
