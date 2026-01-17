# 🚨 Linux Server - Emergency Permission Fix

## The Problem You're Seeing

```
apps/admin dev: sh: 1: next: Permission denied
apps/embed dev: sh: 1: next: Permission denied
apps/server dev: sh: 1: tsx: Permission denied
apps/web dev: sh: 1: next: Permission denied
ELIFECYCLE  Command failed with exit code 1.
```

## The Quick Fix (Copy & Paste This)

### SSH into your server and run:

```bash
cd ~/htdocs/www.crm.partnertpcc.com

# Option 1: Run the automated fix (RECOMMENDED)
chmod +x FIX_SERVER_PERMISSIONS.sh
./FIX_SERVER_PERMISSIONS.sh

# Option 2: Manual quick fix
rm -rf node_modules && pnpm install && chmod -R u+x node_modules/.bin && pnpm dev
```

That's it! Your server will be fixed.

---

## What's Happening?

When you deploy code to a Linux server via FTP/SCP/Git, the executable files lose their permissions. The binaries in `node_modules` need to be marked as executable (`x` permission) to run.

**The fix:** Set execute permissions on all binaries.

---

## If That Didn't Work

```bash
# Check current user
whoami

# Fix ownership if needed
chown -R $(whoami):$(whoami) .

# Try again
pnpm dev
```

---

## Complete Details

👉 See [SERVER_PERMISSION_FIX.md](SERVER_PERMISSION_FIX.md) for full troubleshooting guide
