# Port Configuration Update - Summary

**Date:** January 17, 2026  
**Status:** ✅ Complete

## Changes Made

All service ports have been migrated to the production range: **5710-5714**

### Port Mapping

| Service | Old Port | New Port | Configuration |
|---------|----------|----------|---|
| **Node.js API Server** | 3001 | **5710** | `SERVER_PORT` in `.env` |
| **Web App** | 3000 | **5711** | Next.js auto-assign |
| **Embed Widget** | 3003 | **5712** | Next.js auto-assign |
| **CouchDB** | 5984 | **5713** | `COUCHDB_URL` in `.env` |
| **Redis** | 6379 | **5714** | `REDIS_URL` in `.env` |

## Files Updated

### Configuration Files
- ✅ `apps/server/src/config.ts` - Default port configuration
- ✅ `apps/server/.env` - Environment variables
- ✅ `docker-compose.yml` - Local development services
- ✅ `infra/docker-compose.yml` - Infrastructure services

### Documentation Files
- ✅ `README.md`
- ✅ `GETTING_STARTED.md`
- ✅ `DEVELOPMENT.md`
- ✅ `DEPLOYMENT.md`
- ✅ `PRODUCTION_HARDENING.md`
- ✅ `OPERATIONS.md`
- ✅ `MONITORING_OBSERVABILITY.md`
- ✅ `TROUBLESHOOTING.md`
- ✅ `SUBDOMAIN_ROUTING.md`
- ✅ `IMPLEMENTATION_PLAN.md`
- ✅ `SESSION_SUMMARY.md`
- ✅ `SESSION_COMPLETION_SUMMARY.md`
- ✅ `SESSION_SUMMARY_BOOKINGS.md`
- ✅ `TWILIO_SMS_GUIDE.md`
- ✅ `TWILIO_SETUP_GUIDE.md`
- ✅ `DISASTER_RECOVERY_RUNBOOK.md`
- ✅ `BACKUP.md`
- ✅ `COPILOT_INSTRUCTIONS.md`
- ✅ `CLIENT_MANAGEMENT_TESTING.md`
- ✅ `CLIENT_MANAGEMENT_SYSTEM_SUMMARY.md`
- ✅ `CLIENT_MANAGEMENT_VISUAL_SUMMARY.md`

### Test Scripts
- ✅ `test-auth-endpoints.ps1`
- ✅ `test-booking-api.ps1`
- ✅ `test-sms-endpoints.ps1`

### New Installation Tools
- ✅ `setup-ports.ps1` - Windows PowerShell setup script
- ✅ `setup-ports.sh` - Bash/Linux/macOS setup script
- ✅ `PORT_CONFIGURATION.md` - Comprehensive port configuration guide

## Setup Instructions

### First-Time Installation

#### Windows (PowerShell)
```powershell
# Using defaults (5710-5714)
.\setup-ports.ps1

# Or interactive mode for custom ports
.\setup-ports.ps1 -Interactive

# Or specify custom ports directly
.\setup-ports.ps1 -ServerPort 5710 -WebPort 5711 -CouchDbPort 5713 -RedisPort 5714
```

#### Linux/macOS (Bash)
```bash
# Using defaults (5710-5714)
chmod +x setup-ports.sh
./setup-ports.sh

# Or interactive mode
./setup-ports.sh --interactive

# Or with environment variables
SERVER_PORT=5710 WEB_PORT=5711 ./setup-ports.sh
```

### Manual Configuration

Edit `.env` file in `apps/server/`:

```env
SERVER_PORT=5710
SERVER_URL=http://localhost:5710
COUCHDB_URL=http://localhost:5713
REDIS_URL=redis://localhost:5714
CORS_ORIGIN=http://localhost:5711,http://localhost:5710,http://localhost:5712
```

## Verification

After setup, verify everything is working:

```bash
# Check API health
curl http://localhost:5710/health

# Check API status
curl http://localhost:5710/status

# Check web app
open http://localhost:5711

# Initialize database
curl http://localhost:5710/api/v1/bootstrap
```

## Key Features

### ✅ Configurable on First Run
- Installers detect and avoid port conflicts
- Interactive mode for custom port selection
- Non-interactive mode with environment variables

### ✅ Cross-Platform Support
- Windows PowerShell (`setup-ports.ps1`)
- Linux/macOS Bash (`setup-ports.sh`)
- Docker Compose support
- Kubernetes ready

### ✅ Backward Compatibility
- Default environment variables still work
- Existing `.env` files automatically updated
- Backup files created during updates (`.backup`)

### ✅ Production Ready
- All documentation updated
- Security best practices included
- Reverse proxy examples for Nginx
- Database migration support

## Environment-Specific Configurations

### Development
```env
NODE_ENV=development
SERVER_PORT=5710
COUCHDB_URL=http://localhost:5713
REDIS_URL=redis://localhost:5714
```

### Staging
```env
NODE_ENV=staging
SERVER_PORT=5710
COUCHDB_URL=http://couchdb.staging:5713
REDIS_URL=redis://redis.staging:5714
```

### Production
```env
NODE_ENV=production
SERVER_PORT=5710
SERVER_URL=https://api.scheduleright.org
COUCHDB_URL=http://couchdb.internal:5713
REDIS_URL=redis://redis.internal:5714
CORS_ORIGIN=https://app.scheduleright.org
```

## Docker Deployment

All ports are now properly mapped in docker-compose files:

```yaml
services:
  api:
    ports:
      - "5710:5710"
    environment:
      SERVER_PORT: 5710
  
  couchdb:
    ports:
      - "5713:5713"
  
  redis:
    ports:
      - "5714:5714"
```

## Next Steps

1. **Run the setup script:**
   ```bash
   ./setup-ports.ps1  # Windows
   ./setup-ports.sh   # Linux/macOS
   ```

2. **Start services:**
   ```bash
   pnpm dev
   ```

3. **Verify all services are running:**
   ```bash
   docker-compose ps
   ```

4. **Access the application:**
   - Web App: http://localhost:5711
   - API: http://localhost:5710
   - Bootstrap: http://localhost:5710/api/v1/bootstrap

## Troubleshooting

See [PORT_CONFIGURATION.md](PORT_CONFIGURATION.md) for detailed troubleshooting guide including:
- Port conflict resolution
- Firewall configuration
- Service communication issues
- Monitoring port usage

## Support

For issues or questions:
1. Check [PORT_CONFIGURATION.md](PORT_CONFIGURATION.md)
2. Review [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
3. Check service health: `curl http://localhost:5710/health`
4. View logs: `docker-compose logs -f api`

---

**All port configurations are now standardized and production-ready! 🚀**
