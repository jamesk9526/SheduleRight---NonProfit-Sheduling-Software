# Production Hardening Checklist

This document provides a comprehensive guide to deploying ScheduleRight safely and reliably to production.

---

## 1. Security Configuration

### 1.1 Environment Variables

**Create a secure `.env.production` file:**

```bash
# Server
NODE_ENV=production
SERVER_PORT=3001
SERVER_URL=https://api.scheduleright.org  # Your domain

# Database (MySQL recommended for production)
DB_PROVIDER=mysql
MYSQL_HOST=db.internal.example.com        # Use internal DNS
MYSQL_PORT=3306
MYSQL_DATABASE=scheduleright
MYSQL_USER=scheduleright_user
MYSQL_PASSWORD=<STRONG_PASSWORD_64_CHARS>

# Redis (for caching and job queues)
REDIS_URL=redis://redis.internal.example.com:6379

# JWT (generate secure random keys)
JWT_SECRET=<RANDOM_256_BIT_KEY>            # 32+ char random string
JWT_EXPIRY=900                             # 15 minutes
REFRESH_TOKEN_EXPIRY=604800                # 7 days

# CORS (restrict to your domains only)
CORS_ORIGIN=https://app.scheduleright.org,https://admin.scheduleright.org

# Twilio (optional SMS reminders)
TWILIO_ACCOUNT_SID=<YOUR_ACCOUNT_SID>
TWILIO_AUTH_TOKEN=<YOUR_AUTH_TOKEN>
TWILIO_PHONE_NUMBER=+1234567890

# Observability
LOG_LEVEL=info
OTEL_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=https://otel-collector.internal.example.com:4317
```

**Security best practices:**
- ✅ Store in AWS Secrets Manager, Azure Key Vault, or similar
- ✅ Never commit `.env.production` to git
- ✅ Use strong, randomly generated passwords (minimum 32 characters)
- ✅ Rotate secrets every 90 days
- ✅ Use different secrets for staging and production
- ✅ Restrict CORS to your exact domains (no wildcards)

### 1.2 HTTPS/TLS

**Enable HTTPS enforcement:**
- Already configured: `httpsEnforcement` middleware activates in production
- Redirects all HTTP to HTTPS (301 permanent redirect)
- HSTS header set to 1 year with preload

**Certificate management:**
```bash
# Using Let's Encrypt with certbot
sudo certbot certonly --standalone -d api.scheduleright.org
sudo certbot renew --quiet  # Add to cron for auto-renewal
```

**Nginx reverse proxy example:**
```nginx
server {
  listen 443 ssl http2;
  server_name api.scheduleright.org;

  ssl_certificate /etc/letsencrypt/live/api.scheduleright.org/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/api.scheduleright.org/privkey.pem;
  
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers HIGH:!aNULL:!MD5;
  ssl_prefer_server_ciphers on;

  # HTTP/2 Server Push
  ssl_session_cache shared:SSL:10m;
  ssl_session_timeout 10m;

  location / {
    proxy_pass http://localhost:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}

server {
  listen 80;
  server_name api.scheduleright.org;
  return 301 https://$server_name$request_uri;
}
```

### 1.3 Security Headers

**Already configured in the application:**
- ✅ `X-Content-Type-Options: nosniff` - Prevent MIME type sniffing
- ✅ `X-XSS-Protection: 1; mode=block` - Enable XSS filter
- ✅ `X-Frame-Options: DENY` - Prevent clickjacking
- ✅ `Strict-Transport-Security: max-age=31536000` - HSTS enforcement
- ✅ `Referrer-Policy: strict-origin-when-cross-origin` - Control referrer leaking
- ✅ `Permissions-Policy` - Restrict browser features

**Verify headers:**
```bash
curl -I https://api.scheduleright.org/health
# Should see all security headers
```

### 1.4 Rate Limiting

**Current configuration:**
- Standard rate limit: 100 requests per 15 minutes per IP
- Auth endpoints: Special stricter limits
- Enforced on all routes except health/status

**Increase limits for production:**
```typescript
// In middleware/rate-limit.ts
export const standardRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  maxRequests: 300,             // Increase from 100 for production
})

export const authRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,              // Strict limit for login attempts
})

export const smsRateLimit = createRateLimiter({
  windowMs: 60 * 60 * 1000,     // 1 hour
  maxRequests: 50,              // SMS cost control
})
```

**Per-user rate limiting:**
```bash
# Add to SMS send endpoint
POST /api/v1/reminders/send  →  10 requests per hour per user
POST /api/v1/auth/login      →  5 failed attempts before 30-min lockout
```

### 1.5 SQL Injection Prevention

**Already implemented:**
- ✅ Parameterized MySQL queries via mysql2/promise
- ✅ Input validation with Zod schemas
- ✅ No dynamic SQL construction

**Verify:**
```bash
grep -r "mysql.query" apps/server/src
# Should use: `SELECT * FROM users WHERE id = ?` pattern
```

---

## 2. Database Hardening

### 2.1 MySQL Configuration

**Restricted user permissions:**
```sql
-- Create application-specific user (not root)
CREATE USER 'scheduleright_user'@'app-server.internal' IDENTIFIED BY '<STRONG_PASSWORD>';

-- Grant only necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON scheduleright.* TO 'scheduleright_user'@'app-server.internal';

-- Deny dangerous operations
REVOKE FILE, SUPER, GRANT OPTION, PROCESS ON *.* FROM 'scheduleright_user'@'app-server.internal';

-- Disable root remote access
UPDATE mysql.user SET Host = 'localhost' WHERE User = 'root';
```

**Backup strategy:**
```bash
# Daily encrypted backups
mysqldump --single-transaction --quick --lock-tables=false \
  -h $MYSQL_HOST -u $MYSQL_USER -p$MYSQL_PASSWORD \
  scheduleright | gzip | \
  openssl enc -aes-256-cbc -pass pass:$BACKUP_KEY > \
  /backups/scheduleright-$(date +%Y%m%d).sql.gz.enc

# Add to cron for daily 2 AM backup
0 2 * * * /usr/local/bin/backup-mysql.sh
```

**Verify backups work:**
```bash
# Test restore monthly
openssl enc -d -aes-256-cbc -in /backups/latest.sql.gz.enc | \
  gunzip | mysql -h staging-db -u root -p scheduleright_test
```

**Enable binary logging (for point-in-time recovery):**
```ini
[mysqld]
log-bin = mysql-bin
binlog-format = MIXED
expire_logs_days = 7
max_binlog_size = 500M
```

### 2.2 Monitor Database

```sql
-- Create monitoring user
CREATE USER 'monitor'@'localhost' IDENTIFIED BY '<PASSWORD>';
GRANT SELECT ON performance_schema.* TO 'monitor'@'localhost';

-- Check query performance
SELECT EVENT_NAME, COUNT_STAR, SUM_TIMER_WAIT
FROM performance_schema.events_statements_summary_global_by_event_name
ORDER BY SUM_TIMER_WAIT DESC
LIMIT 10;

-- Check slow queries
SELECT query_time, lock_time, rows_sent, rows_examined, sql_text
FROM mysql.slow_log
ORDER BY query_time DESC
LIMIT 20;
```

---

## 3. Application Hardening

### 3.1 Secrets Rotation

**Implement automated secret rotation:**

```typescript
// services/secret-rotation.service.ts
export async function rotateSecrets() {
  const rotationInterval = 90 * 24 * 60 * 60 * 1000  // 90 days
  
  setInterval(async () => {
    try {
      // 1. Generate new JWT secret
      const newJwtSecret = crypto.randomBytes(32).toString('hex')
      
      // 2. Update in secrets manager
      await secretsManager.setSecret('JWT_SECRET', newJwtSecret)
      
      // 3. Restart service with new secret
      await restartService()
      
      logger.info('Secrets rotated successfully')
    } catch (error) {
      logger.error('Secret rotation failed', error)
      // Alert ops team
      await notifyOps('Secret rotation failed')
    }
  }, rotationInterval)
}
```

### 3.2 Dependency Audits

```bash
# Regular security audits
npm audit --production
npm audit fix

# For supply chain security
pnpm audit
npx snyk test

# Update outdated packages monthly
npm update
```

### 3.3 Input Validation

**All endpoints validate with Zod:**
```typescript
const CreateBookingSchema = z.object({
  clientName: z.string().min(1).max(100),
  clientEmail: z.string().email(),
  clientPhone: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  notes: z.string().max(500).optional(),
})
```

**Test with malicious input:**
```bash
# SQL injection attempt
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin'\''--","password":"x"}'

# Should get validation error, not SQL error
```

---

## 4. Monitoring & Observability

### 4.1 Health Checks

**Three-tier health system:**

1. **Liveness Probe** (`/health`) - Is server running?
   ```bash
   curl http://localhost:3001/health
   ```

2. **Readiness Probe** (`/readiness`) - Is server ready to handle traffic?
   ```bash
   curl http://localhost:3001/readiness
   # Checks database, Redis, external services
   ```

3. **Status Dashboard** (`/status`) - Detailed service information
   ```bash
   curl http://localhost:3001/status
   ```

**Kubernetes configuration:**
```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3001
  initialDelaySeconds: 10
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /readiness
    port: 3001
  initialDelaySeconds: 30
  periodSeconds: 5
```

### 4.2 Logging

**Already configured:**
- ✅ Structured JSON logging via Pino
- ✅ Request/response logging middleware
- ✅ Error logging with context
- ✅ Configurable log levels

**Production log level:**
```bash
LOG_LEVEL=info  # Not debug - too verbose
```

**Log aggregation setup:**
```bash
# Send logs to central system (e.g., ELK Stack)
# Use Pino HTTP transport:
```

```typescript
import pino from 'pino'

export const logger = pino(
  {
    level: process.env.LOG_LEVEL || 'info',
  },
  pino.transport({
    target: 'pino-http-send',
    options: {
      url: 'https://logs.example.com/elastic',
      headers: {
        'X-API-Key': process.env.LOG_API_KEY,
      },
    },
  })
)
```

### 4.3 Metrics Collection

**Available endpoints:**
- `/metrics` - Prometheus-compatible metrics
- Request/response times, status codes, error rates

**Configure Prometheus scraping:**
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'scheduleright-api'
    static_configs:
      - targets: ['localhost:3001']
    metrics_path: '/metrics'
    scrape_interval: 15s
```

---

## 5. Deployment

### 5.1 Docker Deployment

**Secure Dockerfile:**
```dockerfile
# Use specific version, not latest
FROM node:20.11.0-alpine

# Don't run as root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

WORKDIR /app

# Copy only necessary files
COPY --chown=nodejs:nodejs package*.json ./
COPY --chown=nodejs:nodejs apps/server/src ./src

# Install only production dependencies
RUN npm ci --only=production

USER nodejs

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["node", "dist/index.js"]
```

**Docker Compose for production (with security):**
```yaml
version: '3.8'

services:
  api:
    image: scheduleright-api:v1.0.0
    container_name: scheduleright-api
    restart: unless-stopped
    read_only: true
    tmpfs:
      - /tmp
      - /var/tmp
    environment:
      NODE_ENV: production
      DB_PROVIDER: mysql
      # Use secrets, not env vars
      DATABASE_URL: ${DATABASE_URL}
    ports:
      - "3001:3001"
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - scheduleright
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 5s
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE

  mysql:
    image: mysql:8.0.35
    container_name: scheduleright-mysql
    restart: unless-stopped
    environment:
      MYSQL_DATABASE: scheduleright
      MYSQL_USER: scheduleright
      MYSQL_PASSWORD: ${MYSQL_PASSWORD}
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
    volumes:
      - mysql_data:/var/lib/mysql
      - ./mysql-init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    ports:
      - "3306:3306"
    networks:
      - scheduleright
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5
    cap_drop:
      - ALL

  redis:
    image: redis:7.2-alpine
    container_name: scheduleright-redis
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    networks:
      - scheduleright
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

networks:
  scheduleright:
    driver: bridge

volumes:
  mysql_data:
  redis_data:
```

### 5.2 Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: scheduleright-api
  labels:
    app: scheduleright-api
spec:
  replicas: 3  # High availability
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: scheduleright-api
  template:
    metadata:
      labels:
        app: scheduleright-api
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "3001"
        prometheus.io/path: "/metrics"
    spec:
      serviceAccountName: scheduleright
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        fsReadOnlyRootFilesystem: true
      
      containers:
      - name: api
        image: scheduleright-api:v1.0.0
        imagePullPolicy: IfNotPresent
        
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          runAsNonRoot: true
          capabilities:
            drop:
              - ALL
        
        ports:
        - containerPort: 3001
          name: http
          protocol: TCP
        
        env:
        - name: NODE_ENV
          value: "production"
        - name: DB_PROVIDER
          value: "mysql"
        
        envFrom:
        - configMapRef:
            name: scheduleright-config
        - secretRef:
            name: scheduleright-secrets
        
        livenessProbe:
          httpGet:
            path: /health
            port: http
          initialDelaySeconds: 10
          periodSeconds: 10
          timeoutSeconds: 3
          failureThreshold: 3
        
        readinessProbe:
          httpGet:
            path: /readiness
            port: http
          initialDelaySeconds: 30
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 2
        
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 512Mi
        
        volumeMounts:
        - name: tmp
          mountPath: /tmp
        - name: var-tmp
          mountPath: /var/tmp
      
      volumes:
      - name: tmp
        emptyDir: {}
      - name: var-tmp
        emptyDir: {}
      
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - scheduleright-api
              topologyKey: kubernetes.io/hostname
```

### 5.3 SSL/TLS Termination

**With Ingress:**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: scheduleright-ingress
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - api.scheduleright.org
    secretName: scheduleright-tls
  rules:
  - host: api.scheduleright.org
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: scheduleright-api
            port:
              number: 3001
```

---

## 6. Operations Runbook

### 6.1 Emergency Procedures

**Service Down**
```bash
# 1. Check logs
docker logs scheduleright-api | tail -100

# 2. Health check
curl -s http://localhost:3001/readiness | jq

# 3. Restart service
docker-compose restart api

# 4. Verify recovery
curl http://localhost:3001/health
```

**Database Connection Lost**
```bash
# 1. Check database status
mysql -h $MYSQL_HOST -u $MYSQL_USER -p -e "SELECT 1"

# 2. Check network connectivity
ping $MYSQL_HOST
telnet $MYSQL_HOST 3306

# 3. Check credentials
echo $MYSQL_PASSWORD

# 4. Restart service
docker-compose restart api
```

**High Memory Usage**
```bash
# 1. Check memory
docker stats scheduleright-api

# 2. Check for memory leaks in logs
docker logs scheduleright-api | grep -i "memory\|heap\|gc"

# 3. Increase limits in docker-compose.yml
# mem_limit: 1g

# 4. Restart with new limits
docker-compose down && docker-compose up -d
```

### 6.2 Backup & Recovery

**Backup schedule:**
```bash
# Daily full backups at 2 AM
0 2 * * * /usr/local/bin/backup-scheduleright.sh

# Hourly incremental backups
0 * * * * /usr/local/bin/backup-scheduleright-incremental.sh
```

**Restore from backup:**
```bash
# Decrypt backup
openssl enc -d -aes-256-cbc -in scheduleright-20250116.sql.gz.enc | gunzip > restore.sql

# Restore to new database
mysql -h new-host -u root -p scheduleright < restore.sql

# Verify data
mysql -h new-host -u root -p scheduleright -e "SELECT COUNT(*) FROM users;"
```

### 6.3 Version Upgrades

**Pre-upgrade checklist:**
- [ ] Backup database
- [ ] Backup application configuration
- [ ] Test upgrade on staging environment
- [ ] Schedule maintenance window (off-peak hours)
- [ ] Notify users of planned downtime
- [ ] Prepare rollback procedure

**Upgrade steps:**
```bash
# 1. Stop traffic (close load balancer)
kubectl set replicas deployment/scheduleright-api --replicas=0

# 2. Backup database
mysqldump ... > backup-pre-upgrade.sql

# 3. Run migrations
docker run --rm -e DB_PROVIDER=mysql \
  --network scheduleright \
  scheduleright-api:v1.1.0 \
  npm run db:mysql:migrate

# 4. Deploy new version
kubectl set image deployment/scheduleright-api \
  api=scheduleright-api:v1.1.0

# 5. Monitor logs
kubectl logs -f deployment/scheduleright-api

# 6. Resume traffic
kubectl set replicas deployment/scheduleright-api --replicas=3

# 7. Verify health
curl http://api.scheduleright.org/readiness
```

---

## 7. Security Audit Checklist

- [ ] All environment variables set securely
- [ ] HTTPS/TLS enabled and enforced
- [ ] Security headers verified
- [ ] Rate limiting active
- [ ] Database user permissions restricted
- [ ] Regular backups in place and tested
- [ ] Secrets rotation enabled
- [ ] Log aggregation configured
- [ ] Monitoring alerts set up
- [ ] Incident response plan documented
- [ ] Security scanning tools enabled (npm audit, Snyk)
- [ ] Dependencies kept up-to-date
- [ ] Input validation on all endpoints
- [ ] CORS configured strictly
- [ ] Health checks configured for orchestrators

---

## 8. Post-Launch Monitoring

**Key metrics to monitor:**
- API response times (p50, p95, p99)
- Error rates (5xx, 4xx)
- Database query performance
- Authentication success/failure rates
- Resource usage (CPU, memory, disk)
- SMS delivery rates (if applicable)
- User sessions and activity

**Setup alerts for:**
```yaml
alerts:
  - name: high_error_rate
    condition: error_rate > 5%
    action: page_oncall

  - name: slow_database
    condition: db_query_time > 1s
    action: notify_ops

  - name: low_disk_space
    condition: disk_free < 10%
    action: page_oncall

  - name: auth_failure_spike
    condition: failed_logins > 10/min
    action: notify_security
```

---

## Contact & Escalation

- **Primary On-Call:** [contact info]
- **Backup On-Call:** [contact info]
- **Security Team:** [contact info]
- **Database Admin:** [contact info]
- **Infrastructure:** [contact info]

---

**Last Updated:** January 16, 2025  
**Version:** 1.0  
**Review Frequency:** Quarterly

