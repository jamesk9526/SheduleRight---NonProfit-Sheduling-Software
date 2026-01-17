# ScheduleRight - Production Deployment Checklist

**Version:** 1.0  
**Updated:** January 17, 2026  
**Port Range:** 5710-5714

---

## Pre-Deployment Setup

### Step 1: Configure Ports

- [ ] **Windows Users**
  ```powershell
  .\setup-ports.ps1
  # Or for custom ports:
  .\setup-ports.ps1 -ServerPort 5710 -WebPort 5711 -CouchDbPort 5713 -RedisPort 5714
  ```

- [ ] **Linux/macOS Users**
  ```bash
  chmod +x setup-ports.sh
  ./setup-ports.sh
  # Or for custom ports:
  SERVER_PORT=5710 WEB_PORT=5711 COUCHDB_PORT=5713 REDIS_PORT=5714 ./setup-ports.sh
  ```

- [ ] **Manual Configuration** (if scripts don't work)
  - [ ] Edit `apps/server/.env`
  - [ ] Update `docker-compose.yml`
  - [ ] Verify all ports are updated

### Step 2: Verify Configuration

- [ ] Check `.env` file has correct ports:
  ```bash
  grep -E "PORT|URL" apps/server/.env
  ```

- [ ] Check `docker-compose.yml` has correct mappings:
  ```bash
  grep -E ":[0-9]{4}" docker-compose.yml
  ```

- [ ] Ensure ports are available:
  ```bash
  # Windows PowerShell
  Test-NetConnection -ComputerName localhost -Port 5710
  
  # Linux/macOS
  lsof -i :5710
  ```

---

## Development Setup

### Step 3: Install Dependencies

- [ ] Install Node.js packages
  ```bash
  pnpm install
  ```

- [ ] Start Docker services
  ```bash
  docker-compose up -d
  ```

- [ ] Verify Docker containers running
  ```bash
  docker-compose ps
  # Should show: couchdb (Up), redis (Up)
  ```

### Step 4: Start Development Servers

- [ ] Start all dev servers
  ```bash
  pnpm dev
  ```

- [ ] Wait for startup messages:
  ```
  ✓ web ready in 2.5s (port 5711)
  ✓ embed ready in 2.5s (port 5712)
  ✓ server ready (port 5710)
  ```

### Step 5: Test Access

- [ ] **Web App**
  ```bash
  curl http://localhost:5711
  # or open in browser: http://localhost:5711
  ```

- [ ] **API Health**
  ```bash
  curl http://localhost:5710/health
  # Should return: {"status":"ok"}
  ```

- [ ] **API Status**
  ```bash
  curl http://localhost:5710/status
  # Should return detailed service status
  ```

- [ ] **Database Connection**
  ```bash
  curl http://localhost:5710/readiness
  # Should return database connection status
  ```

---

## Database Setup

### Step 6: Initialize Database

- [ ] **Bootstrap Admin User**
  ```bash
  curl http://localhost:5710/api/v1/bootstrap
  # Follow the flow to create first admin account
  ```

- [ ] **Verify Database Connectivity**
  ```bash
  # CouchDB
  curl http://localhost:5713
  # Should return CouchDB version info
  
  # Redis
  redis-cli -p 5714 ping
  # Should return: PONG
  ```

- [ ] **Check Database Creation**
  ```bash
  curl http://admin:password@localhost:5713/_all_dbs
  # Should list: ["scheduleright"]
  ```

### Step 7: Load Sample Data (Optional)

- [ ] **Run Database Seeder**
  ```bash
  pnpm run seed
  # Creates test organizations, users, and bookings
  ```

- [ ] **Verify Data Loaded**
  ```bash
  curl http://localhost:5710/api/v1/organizations
  # Should return list of organizations
  ```

---

## Testing

### Step 8: Functionality Tests

- [ ] **Authentication**
  ```bash
  # Test login
  curl -X POST http://localhost:5710/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@example.com","password":"password"}'
  ```

- [ ] **Client Booking**
  ```bash
  # Test booking creation
  curl -X POST http://localhost:5710/api/v1/bookings \
    -H "Authorization: Bearer $TOKEN"
  ```

- [ ] **Email/SMS** (if configured)
  ```bash
  # Test SMS status
  curl http://localhost:5710/api/v1/reminders/twilio-status
  ```

### Step 9: Performance Baseline

- [ ] **Check API Metrics**
  ```bash
  curl http://localhost:5710/metrics | jq '.summary'
  ```

- [ ] **Monitor Database Size**
  ```bash
  curl http://admin:password@localhost:5713/scheduleright | jq '.data_size'
  ```

- [ ] **Check Memory Usage**
  ```bash
  docker stats scheduleright-redis
  ```

---

## Production Hardening

### Step 10: Security Configuration

- [ ] **Update Environment Variables**
  ```env
  NODE_ENV=production
  JWT_SECRET=<generate-strong-random-key>
  CORS_ORIGIN=https://yourdomain.com
  ```

- [ ] **Restrict CORS**
  - [ ] Remove localhost URLs
  - [ ] Add production domain only
  - [ ] Test with curl:
    ```bash
    curl -H "Origin: https://yourdomain.com" \
         -H "Access-Control-Request-Method: GET" \
         http://localhost:5710/health
    ```

- [ ] **Configure TLS/HTTPS**
  - [ ] Generate SSL certificates
  - [ ] Configure reverse proxy (Nginx/HAProxy)
  - [ ] Force HTTPS redirect

### Step 11: Monitoring & Logging

- [ ] **Enable Logging**
  ```env
  LOG_LEVEL=info
  OTEL_ENABLED=true
  ```

- [ ] **Configure Error Tracking** (optional)
  ```env
  SENTRY_DSN=https://your-sentry-dsn
  ```

- [ ] **Set Up Monitoring**
  - [ ] Prometheus for metrics
  - [ ] Grafana for dashboards
  - [ ] ELK stack for logs (optional)

### Step 12: Database Backup

- [ ] **Configure Automated Backup**
  ```bash
  # CouchDB backup
  curl -X POST http://admin:password@localhost:5713/_replicate \
    -d '{"source":"scheduleright","target":"backup_db"}'
  ```

- [ ] **Test Backup Restoration**
  - [ ] Backup a small dataset
  - [ ] Delete original
  - [ ] Restore from backup
  - [ ] Verify data integrity

---

## Deployment Options

### Docker Deployment

- [ ] **Build Docker Image**
  ```bash
  docker build -t scheduleright:latest .
  ```

- [ ] **Run Container**
  ```bash
  docker run -p 5710:5710 \
    -e SERVER_PORT=5710 \
    -e NODE_ENV=production \
    scheduleright:latest
  ```

### Kubernetes Deployment

- [ ] **Create ConfigMap**
  ```bash
  kubectl create configmap scheduleright-config \
    --from-literal=SERVER_PORT=5710 \
    --from-literal=NODE_ENV=production
  ```

- [ ] **Deploy Services**
  ```bash
  kubectl apply -f k8s/deployment.yaml
  kubectl apply -f k8s/service.yaml
  ```

- [ ] **Verify Deployment**
  ```bash
  kubectl get pods -l app=scheduleright
  ```

### Traditional Server Deployment

- [ ] **Install Node.js**
  ```bash
  node --version  # v18+
  npm install -g pnpm
  ```

- [ ] **Clone Repository**
  ```bash
  git clone <repo-url>
  cd SheduleRight---NonProfit-Sheduling-Software
  ```

- [ ] **Install & Start**
  ```bash
  pnpm install
  pnpm build
  pnpm start
  ```

---

## Post-Deployment

### Step 13: Smoke Tests

- [ ] **Access Web Application**
  - [ ] http://localhost:5711 loads
  - [ ] Login page displays
  - [ ] Can create account

- [ ] **Test API Endpoints**
  - [ ] POST /auth/login
  - [ ] GET /organizations
  - [ ] GET /bookings
  - [ ] POST /bookings

- [ ] **Verify Database Operations**
  - [ ] Can create records
  - [ ] Can read records
  - [ ] Can update records
  - [ ] Can delete records

### Step 14: User Acceptance Testing

- [ ] **Test Core Workflows**
  - [ ] Client booking flow
  - [ ] Admin approval flow
  - [ ] SMS notifications (if enabled)
  - [ ] Email confirmations (if enabled)

- [ ] **Performance Check**
  - [ ] Page load time < 2s
  - [ ] API response time < 200ms
  - [ ] No console errors

### Step 15: Documentation & Handoff

- [ ] **Update Documentation**
  - [ ] API endpoints reference
  - [ ] Admin guide
  - [ ] User guide
  - [ ] Troubleshooting guide

- [ ] **Train Support Team**
  - [ ] Common issues & fixes
  - [ ] Backup/restore procedures
  - [ ] Monitoring & alerts
  - [ ] Escalation procedures

- [ ] **Create Runbooks**
  - [ ] Daily operations
  - [ ] Troubleshooting
  - [ ] Disaster recovery
  - [ ] Performance optimization

---

## Ongoing Maintenance

### Daily Tasks

- [ ] **Monitor Service Health**
  ```bash
  curl http://localhost:5710/health
  ```

- [ ] **Check Logs for Errors**
  ```bash
  docker-compose logs --tail=100 api
  ```

- [ ] **Monitor Disk Space**
  ```bash
  df -h
  ```

### Weekly Tasks

- [ ] **Review Metrics**
  - [ ] API response times
  - [ ] Error rates
  - [ ] Database size

- [ ] **Check Backups**
  - [ ] Backup completion
  - [ ] Backup integrity
  - [ ] Backup storage

### Monthly Tasks

- [ ] **Security Audit**
  - [ ] Review access logs
  - [ ] Check for suspicious activity
  - [ ] Update dependencies

- [ ] **Performance Tuning**
  - [ ] Analyze slow queries
  - [ ] Optimize database indexes
  - [ ] Review cache hit rates

---

## Rollback Plan

If deployment fails:

### Immediate Actions

- [ ] Stop current services
  ```bash
  docker-compose down
  ```

- [ ] Restore previous version
  ```bash
  git checkout previous-tag
  docker-compose up -d
  ```

- [ ] Restore database from backup
  ```bash
  # See backup restoration steps above
  ```

### Communication

- [ ] Notify stakeholders of issue
- [ ] Provide status updates
- [ ] Set ETA for resolution

---

## Sign-Off

- [ ] **Technical Lead**: _____________ Date: _______
- [ ] **System Admin**: _____________ Date: _______
- [ ] **QA Manager**: ______________ Date: _______

---

**All checks passed! ✅ Ready for production deployment.**

For detailed information, see:
- [PORT_CONFIGURATION.md](PORT_CONFIGURATION.md)
- [PRODUCTION_HARDENING.md](PRODUCTION_HARDENING.md)
- [OPERATIONS.md](OPERATIONS.md)
