# ScheduleRight - Port Configuration Quick Reference

## 🚀 Quick Start

### Windows
```powershell
# Setup with default ports (5710-5714)
.\setup-ports.ps1

# Interactive mode
.\setup-ports.ps1 -Interactive

# Custom ports
.\setup-ports.ps1 -ServerPort 8000 -WebPort 8001 -CouchDbPort 8003 -RedisPort 8004
```

### Linux/macOS
```bash
# Setup with default ports
chmod +x setup-ports.sh && ./setup-ports.sh

# Interactive mode
./setup-ports.sh -i

# Custom ports
SERVER_PORT=8000 WEB_PORT=8001 ./setup-ports.sh
```

---

## 📊 Default Port Mapping

```
┌─────────────────────────────────────┐
│    ScheduleRight Port Assignment    │
├─────────────────────────────────────┤
│ API Server (Node.js)      → 5710    │
│ Web App (UI)              → 5711    │
│ Embed Widget              → 5712    │
│ CouchDB (Database)        → 5713    │
│ Redis (Cache/Queue)       → 5714    │
└─────────────────────────────────────┘
```

---

## ✅ Verify Installation

```bash
# API Health Check
curl http://localhost:5710/health

# API Status
curl http://localhost:5710/status

# Initialize Database
curl http://localhost:5710/api/v1/bootstrap

# Web App
open http://localhost:5711
```

---

## 📝 Environment Variables

**File:** `apps/server/.env`

```env
# Server
SERVER_PORT=5710
SERVER_URL=http://localhost:5710

# Database
COUCHDB_URL=http://localhost:5713
REDIS_URL=redis://localhost:5714

# CORS
CORS_ORIGIN=http://localhost:5711,http://localhost:5710,http://localhost:5712
```

---

## 🐳 Docker Services

**File:** `docker-compose.yml` or `infra/docker-compose.yml`

```yaml
services:
  couchdb:
    ports:
      - "5713:5713"

  redis:
    ports:
      - "5714:5714"
```

---

## 🔧 Manual Setup (if scripts don't work)

1. Edit `apps/server/.env` and update ports
2. Edit `docker-compose.yml` and update port mappings
3. Run `docker-compose up -d`
4. Run `pnpm dev`
5. Open http://localhost:5711

---

## 📚 Full Documentation

- **Setup Guide:** [PORT_CONFIGURATION.md](PORT_CONFIGURATION.md)
- **Update Summary:** [PORT_UPDATE_SUMMARY.md](PORT_UPDATE_SUMMARY.md)
- **Troubleshooting:** [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

---

## 🚨 Troubleshooting

### Port Already in Use?

**Windows:**
```powershell
$process = Get-NetTCPConnection -LocalPort 5710
Stop-Process -Id $process.OwningProcess -Force
```

**Linux/macOS:**
```bash
lsof -i :5710
kill -9 <PID>
```

### Services Won't Start?

```bash
# Check logs
docker-compose logs -f

# Verify ports are free
netstat -tuln  # Linux
netstat -ano   # Windows
```

### Can't Access Web App?

```bash
# Check if web server is running
curl http://localhost:5711

# Check if API is responsive
curl http://localhost:5710/health
```

---

## 📋 Files Modified

✅ **Configuration:**
- apps/server/.env
- apps/server/src/config.ts
- docker-compose.yml
- infra/docker-compose.yml

✅ **Documentation:**
- README.md
- GETTING_STARTED.md
- DEVELOPMENT.md
- PRODUCTION_HARDENING.md
- And 17+ other docs

✅ **New Tools:**
- setup-ports.ps1 (Windows)
- setup-ports.sh (Linux/macOS)

---

## 🎯 Next Steps

1. Run setup script
2. Start services: `pnpm dev`
3. Open http://localhost:5711
4. Bootstrap: http://localhost:5710/api/v1/bootstrap
5. Check health: curl http://localhost:5710/health

---

**Need Help?**
- Check [PORT_CONFIGURATION.md](PORT_CONFIGURATION.md) for detailed guide
- Review [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues
- Check logs: `docker-compose logs -f`
