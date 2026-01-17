# Linux Server - Permission Denied Error Fix

## 🔴 Problem

When running `pnpm dev` on a Linux server, you get:

```
apps/admin dev: sh: 1: next: Permission denied
apps/embed dev: sh: 1: next: Permission denied
apps/server dev: sh: 1: tsx: Permission denied
apps/web dev: sh: 1: next: Permission denied
ELIFECYCLE  Command failed with exit code 1.
```

**Root Cause:** Executable files in `node_modules` don't have execute permissions set.

---

## ✅ Solution 1: Quick Fix (Recommended)

### On Your Server

```bash
# Navigate to your project directory
cd ~/htdocs/www.crm.partnertpcc.com

# Run the automated fix script
chmod +x FIX_SERVER_PERMISSIONS.sh
./FIX_SERVER_PERMISSIONS.sh
```

The script will:
1. ✓ Clear node_modules and cache
2. ✓ Reinstall all dependencies
3. ✓ Fix all file permissions
4. ✓ Verify the setup

Then test:
```bash
pnpm dev
```

---

## ✅ Solution 2: Manual Fix (If Script Fails)

### Step 1: Reinstall Dependencies

```bash
cd ~/htdocs/www.crm.partnertpcc.com

# Clear cache
rm -rf node_modules
pnpm store prune

# Reinstall
pnpm install
```

### Step 2: Fix File Permissions

```bash
# Make all binaries executable
chmod +x node_modules/.bin/*

# Make shell scripts executable
find node_modules -type f -name "*.sh" -exec chmod +x {} \;

# Fix workspace node_modules
chmod +x apps/*/node_modules/.bin/* 2>/dev/null || true
chmod +x packages/*/node_modules/.bin/* 2>/dev/null || true
```

### Step 3: Verify

```bash
# Check if binaries are executable
ls -la node_modules/.bin/next
ls -la node_modules/.bin/tsx

# Should see: -rwxr-xr-x (with 'x' permissions)
```

### Step 4: Run Dev Server

```bash
pnpm dev
```

---

## ✅ Solution 3: Fix Ownership Issues

If you uploaded files via FTP/SFTP, permissions may be incorrect:

```bash
# Check current ownership
ls -la node_modules/.bin/next

# Fix ownership (if different user installed vs current user)
sudo chown -R $(whoami):$(whoami) ~/.pnpm-store
sudo chown -R $(whoami):$(whoami) node_modules

# Or as root user:
chown -R www-data:www-data node_modules  # if running as www-data
```

---

## ✅ Solution 4: Run with Elevated Permissions

If all else fails, try running with sudo:

```bash
sudo pnpm dev
```

⚠️ **Note:** This is a temporary workaround. Fix the permissions properly for security.

---

## 🔧 Detailed Troubleshooting

### Check What's Failing

```bash
# Test if next can run
./node_modules/.bin/next --version

# Should work. If not, permission issue confirmed.
```

### Check File Permissions

```bash
# List node_modules/.bin with permissions
ls -la node_modules/.bin/

# All should have 'x' (execute):
# -rwxr-xr-x  ← Good
# -rw-r--r--  ← Bad (missing x)
```

### Check User/Group Ownership

```bash
# Check who owns node_modules
ls -ld node_modules
# drwxr-xr-x  20 partnertpcc-www-crm  partnertpcc-www-crm

# Check who owns .bin
ls -ld node_modules/.bin
# drwxr-xr-x  12 partnertpcc-www-crm  partnertpcc-www-crm

# They should match your current user
whoami  # Should match the owner above
```

### Check Current User Permissions

```bash
# Am I in the right group?
groups

# Can I read/write in this directory?
touch test.txt && rm test.txt

# If you can't, you need sudo or to change ownership
```

---

## 🚀 Prevention: Deploy Without Permission Issues

### When Deploying Fresh

```bash
# Clone repository
git clone <repo-url>
cd <project-directory>

# Install with proper permissions from the start
pnpm install

# Set proper permissions during deployment
chmod -R u+x node_modules/.bin

# Test before going live
pnpm dev --dry-run
```

### Using Docker (Recommended)

Avoid permission issues entirely by using Docker:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm
RUN pnpm install

COPY . .

EXPOSE 5710

CMD ["pnpm", "dev"]
```

Then run:
```bash
docker-compose up -d
```

---

## 📋 Checklist

After fixing, verify everything works:

- [ ] `chmod +x` done on node_modules/.bin/*
- [ ] `ls -la node_modules/.bin/next` shows 'x' permissions
- [ ] `ls -la node_modules/.bin/tsx` shows 'x' permissions
- [ ] `whoami` matches owner of node_modules
- [ ] `pnpm dev` runs without permission errors
- [ ] Web app accessible at http://localhost:5711
- [ ] API responds at http://localhost:5710/health

---

## 🆘 Still Having Issues?

### Gather Diagnostic Info

```bash
# Run diagnostics
echo "=== User Info ===" && whoami && groups
echo "=== Directory Permissions ===" && ls -la node_modules/.bin/next
echo "=== Node/npm Info ===" && node --version && pnpm --version
echo "=== Check Processes ===" && ps aux | grep next
```

### Try Complete Reset

```bash
# Nuclear option - complete clean install
rm -rf node_modules pnpm-lock.yaml
pnpm install --force
chmod -R u+x node_modules/.bin
pnpm dev
```

### Check for Disk Space Issues

```bash
# Low disk space can cause permission issues
df -h

# Should show plenty of free space. If not, clean up:
sudo apt-get clean
```

### Check SELinux/AppArmor (If Enabled)

```bash
# Check SELinux status
getenforce

# Check AppArmor
sudo aa-status | grep -i node

# If restrictive, may need to adjust policies
```

---

## 🔒 Security Notes

**DO NOT:**
- ❌ Run `pnpm dev` as root (`sudo pnpm dev`)
- ❌ Use `chmod 777` (too permissive)
- ❌ Run with world-readable permissions

**DO:**
- ✓ Fix ownership with `chown` to match user
- ✓ Use `chmod +x` only on executable files
- ✓ Keep restrictive permissions (755 on directories, 755/644 on files)

---

## 📚 Related Documentation

- [DEPLOYMENT.md](DEPLOYMENT.md) - Server deployment guide
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - General troubleshooting
- [PORT_CONFIGURATION.md](PORT_CONFIGURATION.md) - Port setup guide

---

## Quick Command Reference

```bash
# All-in-one fix
rm -rf node_modules && pnpm install && chmod +x node_modules/.bin/* && pnpm dev

# Just fix permissions
chmod -R u+x node_modules/.bin && find node_modules -name "*.sh" -exec chmod +x {} \;

# Check if it's working
./node_modules/.bin/next --version && ./node_modules/.bin/tsx --version

# Run with diagnostics
DEBUG=* pnpm dev 2>&1 | head -50

# Clean and reinstall
pnpm install --force && pnpm dev
```

---

**Once fixed, you should see:**

```
 ✓ web ready in 2.5s (port 5711)
 ✓ admin ready in 2.5s (port 5712)
 ✓ embed ready in 2.5s (port 5712)
 ✓ server ready (port 5710)
```

**Success! 🎉**
