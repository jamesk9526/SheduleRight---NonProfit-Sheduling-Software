# Port Configuration Guide

This guide explains how to configure ports for your ScheduleRight installation.

## Default Port Mapping

By default, ScheduleRight uses the following port range: **5710-5714**

| Service | Default Port | Purpose | Environment Var |
|---------|-------------|---------|-----------------|
| **Node.js Server (API)** | 5710 | Backend REST API | `SERVER_PORT` |
| **Web App (UI)** | 5711 | Client-facing scheduling interface | Dev auto-assign |
| **Embed Widget** | 5712 | Embeddable booking widget | Dev auto-assign |
| **CouchDB** | 5713 | Document database (if used) | `COUCHDB_URL` |
| **Redis** | 5714 | Session cache & job queue | `REDIS_URL` |

## Quick Setup

### Windows (PowerShell)

#### Using Defaults (5710-5714)
```powershell
.\setup-ports.ps1
```

#### Interactive Configuration
```powershell
.\setup-ports.ps1 -Interactive
```

#### Custom Ports
```powershell
.\setup-ports.ps1 -ServerPort 8080 -WebPort 8081 -CouchDbPort 8082 -RedisPort 8083
```

### Linux / macOS

#### Using Defaults (5710-5714)
```bash
chmod +x setup-ports.sh
./setup-ports.sh
```

#### Interactive Configuration
```bash
./setup-ports.sh --interactive
# or
./setup-ports.sh -i
```

#### Custom Ports (via environment variables)
```bash
SERVER_PORT=8080 WEB_PORT=8081 COUCHDB_PORT=8082 REDIS_PORT=8083 ./setup-ports.sh
```

## Manual Port Configuration

If you prefer to configure ports manually:

### 1. Update Server Configuration

Edit `apps/server/.env`:

```env
# Server
SERVER_PORT=5710
SERVER_URL=http://localhost:5710

# Database - CouchDB
COUCHDB_URL=http://localhost:5713

# Cache & Queues - Redis
REDIS_URL=redis://localhost:5714

# CORS - Allow connections from these ports
CORS_ORIGIN=http://localhost:5711,http://localhost:5710,http://localhost:5712
```

### 2. Update Docker Services

Edit `docker-compose.yml` and `infra/docker-compose.yml`:

```yaml
services:
  couchdb:
    ports:
      - "5713:5713"  # CouchDB
    
  redis:
    ports:
      - "5714:5714"  # Redis
```

### 3. Update Next.js App Configuration

For web app (`apps/web`), Next.js automatically assigns ports in dev mode:
- Primary port: 5711 (web)
- Falls back to next available if in use

Set via environment:
```bash
PORT=5711 pnpm dev --filter=web
```

## Verifying Configuration

After running the setup script or manual configuration:

### Check Server Health
```bash
curl http://localhost:5710/health
```

### Check API Status
```bash
curl http://localhost:5710/status
```

### Bootstrap Admin User
```bash
curl http://localhost:5710/api/v1/bootstrap
```

### Verify Docker Services
```bash
docker-compose ps

# Output should show:
# scheduleright-couchdb    ... Up (port 5713:5713)
# scheduleright-redis      ... Up (port 5714:5714)
```

## Environment-Specific Configuration

### Development (.env.development)
```env
NODE_ENV=development
SERVER_PORT=5710
COUCHDB_URL=http://localhost:5713
REDIS_URL=redis://localhost:5714
```

### Staging (.env.staging)
```env
NODE_ENV=staging
SERVER_PORT=5710
COUCHDB_URL=http://db.staging.internal:5713
REDIS_URL=redis://cache.staging.internal:5714
```

### Production (.env.production)
```env
NODE_ENV=production
SERVER_PORT=5710
SERVER_URL=https://api.scheduleright.org
COUCHDB_URL=http://couchdb.internal:5713
REDIS_URL=redis://redis.internal:5714
CORS_ORIGIN=https://app.scheduleright.org,https://api.scheduleright.org
```

## Docker Deployment

When deploying with Docker, ensure port mappings align:

```yaml
services:
  scheduleright-api:
    image: scheduleright:latest
    ports:
      - "5710:5710"  # Internal:External mapping
    environment:
      SERVER_PORT: 5710
      COUCHDB_URL: http://couchdb:5713
      REDIS_URL: redis://redis:5714

  couchdb:
    image: couchdb:3.3
    ports:
      - "5713:5713"

  redis:
    image: redis:7-alpine
    ports:
      - "5714:5714"
```

## Kubernetes Deployment

For Kubernetes, map container ports to services:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: scheduleright-api
spec:
  ports:
    - port: 5710
      targetPort: 5710
      protocol: TCP
  selector:
    app: scheduleright-api

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: scheduleright-api
spec:
  template:
    spec:
      containers:
      - name: api
        image: scheduleright:latest
        ports:
        - containerPort: 5710
        env:
        - name: SERVER_PORT
          value: "5710"
        - name: COUCHDB_URL
          value: "http://couchdb:5713"
        - name: REDIS_URL
          value: "redis://redis:5714"
```

## Nginx Reverse Proxy

Route traffic from standard ports (80/443) to internal ports:

```nginx
upstream scheduleright_api {
    server localhost:5710;
}

upstream scheduleright_web {
    server localhost:5711;
}

server {
    listen 80;
    server_name api.scheduleright.org;

    location / {
        proxy_pass http://scheduleright_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name scheduleright.org www.scheduleright.org;

    location / {
        proxy_pass http://scheduleright_web;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Troubleshooting Port Issues

### Port Already in Use

Find and kill process using a port:

**Windows PowerShell:**
```powershell
$process = Get-NetTCPConnection -LocalPort 5710 | Select-Object OwningProcess
Stop-Process -Id $process.OwningProcess -Force
```

**Linux/macOS:**
```bash
lsof -i :5710  # Find process
kill -9 <PID>  # Kill process

# Or use fuser
fuser -k 5710/tcp
```

### Port Not Accessible Remotely

If local works but remote doesn't:

1. **Check firewall**: `sudo ufw allow 5710/tcp`
2. **Check binding**: Verify `SERVER_PORT=5710` is set
3. **Check firewall rules**: `sudo iptables -L | grep 5710`

### Services Can't Communicate

Ensure all services use same port mapping in docker-compose:

```yaml
# ❌ WRONG - Port mismatch
couchdb:
  ports:
    - "5984:5984"  # External: 5984, but app expects 5713
  environment:
    - # no PORT env var

# ✓ CORRECT - Consistent ports
couchdb:
  ports:
    - "5713:5713"  # External: 5713
  # Internal container port is still 5984, but mapped to 5713 externally
```

## Port Conflict Resolution

If you have port conflicts on your system:

### Check All Used Ports
**Windows:**
```powershell
netstat -ano
```

**Linux/macOS:**
```bash
lsof -i -P -n
```

### Choose Alternative Ports
If 5710-5714 are occupied, choose a different range:
- Development: 8000-8004
- Staging: 9000-9004
- Production: 10000-10004

### Update Configuration
```bash
# Windows
.\setup-ports.ps1 -ServerPort 8000 -WebPort 8001 -EmbedPort 8002 -CouchDbPort 8003 -RedisPort 8004

# Linux/macOS
SERVER_PORT=8000 WEB_PORT=8001 COUCHDB_PORT=8003 REDIS_PORT=8004 ./setup-ports.sh
```

## Monitoring Port Usage

Keep an eye on port usage with:

```bash
# Linux/macOS - Watch real-time port usage
watch -n 2 'lsof -i -P -n | grep scheduleright'

# Docker - Monitor container ports
docker-compose ps

# Kubernetes - Check service ports
kubectl get svc -l app=scheduleright
```

## Security Considerations

### Development Environment
- Using localhost-only ports (127.0.0.1) is secure
- No firewall rules needed

### Production Environment
- Use private network ports (not exposed to internet)
- Place behind reverse proxy (Nginx, HAProxy)
- Only expose ports 80/443 to public

### Network Isolation
```yaml
# docker-compose.yml
services:
  api:
    networks:
      - internal
  couchdb:
    networks:
      - internal
  redis:
    networks:
      - internal

networks:
  internal:
    driver: bridge
    # Not exposed to host - only accessible internally
```

## Related Documentation

- [DEPLOYMENT.md](DEPLOYMENT.md) - Full deployment instructions
- [PRODUCTION_HARDENING.md](PRODUCTION_HARDENING.md) - Security hardening
- [OPERATIONS.md](OPERATIONS.md) - Operations and monitoring
- [DEVELOPMENT.md](DEVELOPMENT.md) - Development setup
