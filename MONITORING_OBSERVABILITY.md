# Monitoring & Observability Setup Guide

This guide provides comprehensive instructions for setting up monitoring, logging, and observability for ScheduleRight in production.

---

## 1. Structured Logging

### 1.1 Current Logging Configuration

**The application uses Pino for structured JSON logging:**

```typescript
// src/logger.ts
import pino from 'pino'

const level = process.env.LOG_LEVEL || 'info'

export const logger = pino(
  {
    level,
    formatters: {
      level: (label) => {
        return { level: label.toUpperCase() }
      },
      bindings: (bindings) => {
        return {
          pid: bindings.pid,
          hostname: bindings.hostname,
        }
      },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  process.env.NODE_ENV === 'production'
    ? pino.transport({
        target: 'pino-http-send',  // Send to remote logger
        options: {
          url: process.env.LOG_AGGREGATION_URL,
          headers: {
            'X-API-Key': process.env.LOG_API_KEY,
          },
        },
      })
    : pino.transport({
        target: 'pino-pretty',     // Pretty print locally
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      })
)
```

### 1.2 Setting Up Log Aggregation

#### Option A: ELK Stack (Elasticsearch, Logstash, Kibana)

**Install Elasticsearch (Docker):**
```bash
docker run -d --name elasticsearch \
  -e discovery.type=single-node \
  -e xpack.security.enabled=false \
  -p 9200:9200 \
  -v elasticsearch_data:/usr/share/elasticsearch/data \
  docker.elastic.co/elasticsearch/elasticsearch:8.11.0
```

**Setup Logstash pipeline:**
```yaml
# logstash/config/pipeline.conf
input {
  http {
    port => 5044
    codec => json
  }
}

filter {
  if [message] {
    json {
      source => "message"
      target => "parsed"
    }
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "scheduleright-%{+YYYY.MM.dd}"
  }
}
```

**Send logs from application:**
```typescript
import pino from 'pino'

export const logger = pino(
  { level: process.env.LOG_LEVEL || 'info' },
  pino.transport({
    target: 'pino-http-send',
    options: {
      url: 'http://logstash:5044',
      timeout: 10000,
      retry: { retries: 3 },
    },
  })
)
```

**Access Kibana:**
- Open http://localhost:5601
- Create index pattern: `scheduleright-*`
- Create dashboards for key metrics

#### Option B: Datadog

**Setup Datadog agent:**
```yaml
# docker-compose.yml
datadog:
  image: gcr.io/datadoghq/agent:latest
  environment:
    DD_AGENT_HOST: datadog
    DD_TRACE_AGENT_PORT: 8126
    DD_API_KEY: ${DATADOG_API_KEY}
    DD_ENV: production
    DD_SERVICE: scheduleright-api
  ports:
    - "8126:8126/udp"
```

**Configure application logging:**
```typescript
import pino from 'pino'

export const logger = pino(
  { level: process.env.LOG_LEVEL || 'info' },
  pino.transport({
    target: 'pino/file',
    options: {
      destination: '/dev/stdout',
    },
  })
)
```

Datadog will automatically ingest stdout logs.

#### Option C: CloudWatch (AWS)

**Send logs to CloudWatch:**
```typescript
import pino from 'pino'
import awsPinoTransport from 'pino-aws-cloudwatch'

export const logger = pino(
  { level: process.env.LOG_LEVEL || 'info' },
  pino.transport({
    target: awsPinoTransport,
    options: {
      awsRegion: process.env.AWS_REGION || 'us-east-1',
      logGroupName: '/scheduleright/api',
      logStreamName: `${process.env.NODE_ENV}-${Date.now()}`,
    },
  })
)
```

### 1.3 Log Levels in Production

```bash
# Production: Only log important events
LOG_LEVEL=info

# Staging: More verbose for debugging
LOG_LEVEL=debug

# Development: All logs for development
LOG_LEVEL=trace
```

**Log level meanings:**
- `TRACE` - Most verbose, all internal details
- `DEBUG` - Debug information for developers
- `INFO` - General informational messages (recommended for production)
- `WARN` - Warning messages for potentially harmful situations
- `ERROR` - Error messages for error events
- `FATAL` - Critical errors that may cause shutdown

---

## 2. Metrics Collection

### 2.1 Built-in Metrics Endpoint

The application exposes metrics at `/metrics`:

```bash
curl http://localhost:3001/metrics | jq
```

**Example output:**
```json
{
  "timestamp": "2025-01-16T12:34:56.000Z",
  "requests": {
    "total": 15234,
    "perSecond": 42,
    "byMethod": {
      "GET": 8900,
      "POST": 4200,
      "PUT": 1500,
      "DELETE": 634
    },
    "byStatus": {
      "200": 14500,
      "201": 450,
      "400": 200,
      "401": 84
    }
  },
  "performance": {
    "avgResponseTime": 125,
    "p50ResponseTime": 85,
    "p95ResponseTime": 450,
    "p99ResponseTime": 1200
  },
  "errors": {
    "total": 84,
    "perSecond": 0.2,
    "byType": {
      "VALIDATION_ERROR": 40,
      "UNAUTHORIZED": 30,
      "NOT_FOUND": 14
    }
  },
  "database": {
    "connections": 10,
    "activeQueries": 2,
    "avgQueryTime": 25,
    "slowQueryCount": 1
  }
}
```

### 2.2 Prometheus Integration

**Configure Prometheus scraping:**

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'scheduleright-api'
    static_configs:
      - targets: ['localhost:3001']
    metrics_path: '/metrics'
    scrape_interval: 15s
    
  - job_name: 'mysql'
    static_configs:
      - targets: ['localhost:9104']
    
  - job_name: 'redis'
    static_configs:
      - targets: ['localhost:9121']
```

**Export metrics in Prometheus format:**
```typescript
// lib/metrics.ts
import { register, Counter, Histogram, Gauge } from 'prom-client'

export const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
})

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'route'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
})

export const databaseConnections = new Gauge({
  name: 'database_connections_active',
  help: 'Active database connections',
})

export const prometheusMetrics = () => register.metrics()
```

### 2.3 Grafana Dashboards

**Add Prometheus data source:**
1. Go to Grafana UI (http://localhost:3000)
2. Configuration > Data Sources
3. Add Prometheus: `http://prometheus:9090`

**Create dashboard for API metrics:**
```json
{
  "dashboard": {
    "title": "ScheduleRight API Metrics",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])"
          }
        ]
      },
      {
        "title": "Response Time (p95)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, http_request_duration_seconds)"
          }
        ]
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total{status_code=~'5..'}[5m])"
          }
        ]
      },
      {
        "title": "Database Connections",
        "targets": [
          {
            "expr": "database_connections_active"
          }
        ]
      }
    ]
  }
}
```

---

## 3. Distributed Tracing

### 3.1 OpenTelemetry Integration

**Install dependencies:**
```bash
npm install \
  @opentelemetry/api \
  @opentelemetry/sdk-node \
  @opentelemetry/auto-instrumentations-node \
  @opentelemetry/sdk-trace-node \
  @opentelemetry/exporter-trace-otlp-http \
  @opentelemetry/instrumentation-fastify \
  @opentelemetry/instrumentation-mysql2 \
  @opentelemetry/instrumentation-redis
```

**Initialize tracing (in server startup):**
```typescript
// src/tracing.ts
import { NodeSDK } from '@opentelemetry/sdk-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { FastifyInstrumentation } from '@opentelemetry/instrumentation-fastify'
import { MySQLInstrumentation } from '@opentelemetry/instrumentation-mysql2'
import { RedisInstrumentation } from '@opentelemetry/instrumentation-redis'

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector:4317',
  }),
  instrumentations: [
    new FastifyInstrumentation(),
    new MySQLInstrumentation(),
    new RedisInstrumentation(),
  ],
})

sdk.start()
```

**Call before creating Fastify server:**
```typescript
// src/index.ts
import './tracing.js'  // Must be first import
import Fastify from 'fastify'
// ... rest of code
```

### 3.2 Jaeger Integration

**Deploy Jaeger all-in-one:**
```bash
docker run -d --name jaeger \
  -e COLLECTOR_ZIPKIN_HTTP_PORT=9411 \
  -p 16686:16686 \
  -p 4317:4317 \
  -p 9411:9411 \
  jaegertracing/all-in-one:latest
```

**Configure OpenTelemetry:**
```bash
# In .env
OTEL_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4317
```

**View traces:**
- Open http://localhost:16686
- Select service: `scheduleright-api`
- View traces grouped by operation

### 3.3 Trace Examples

**Book an appointment (full trace):**
```
POST /api/v1/bookings
├─ Authentication (jwt validation)
├─ Authorization check
├─ Database queries
│  ├─ Get availability slot
│  ├─ Check booking conflicts
│  └─ Insert new booking
├─ Service call (booking service)
└─ Response (201)
  Duration: 125ms
```

---

## 4. Error Tracking

### 4.1 Sentry Integration

**Install Sentry:**
```bash
npm install @sentry/node @sentry/tracing
```

**Initialize:**
```typescript
// src/sentry.ts
import * as Sentry from '@sentry/node'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.OnUncaughtException(),
    new Sentry.Integrations.OnUnhandledRejection(),
  ],
})
```

**Capture errors:**
```typescript
try {
  await riskyOperation()
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      operation: 'booking_create',
      userId: user.id,
    },
    extra: {
      bookingData,
    },
  })
}
```

### 4.2 Error Dashboard

**View in Sentry UI:**
1. Go to https://sentry.io/organizations/your-org/
2. Select ScheduleRight project
3. Monitor error trends, stack traces, user impact

---

## 5. Alerting

### 5.1 Alert Rules

**Create alerts in Prometheus/Grafana:**

```yaml
# prometheus/alerts.yml
groups:
  - name: scheduleright
    rules:
      # High error rate alert
      - alert: HighErrorRate
        expr: |
          (
            sum(rate(http_requests_total{status_code=~"5.."}[5m]))
            /
            sum(rate(http_requests_total[5m]))
          ) > 0.05
        for: 5m
        annotations:
          summary: "High error rate detected (>5%)"

      # Slow database queries
      - alert: SlowDatabaseQueries
        expr: |
          histogram_quantile(0.95, rate(mysql_query_duration_seconds[5m])) > 1
        for: 10m
        annotations:
          summary: "Database queries slow (p95 > 1s)"

      # Memory usage spike
      - alert: HighMemoryUsage
        expr: |
          process_resident_memory_bytes / 1024 / 1024 > 500
        for: 5m
        annotations:
          summary: "API memory usage > 500MB"

      # Authentication failures spike
      - alert: AuthFailureSpike
        expr: |
          rate(http_requests_total{status_code="401"}[5m]) > 0.5
        for: 2m
        annotations:
          summary: "Auth failure rate spike"

      # SMS delivery failures
      - alert: SMSDeliveryFailures
        expr: |
          rate(twilio_sms_failures_total[5m]) > 0.1
        for: 5m
        annotations:
          summary: "SMS delivery failing"
```

### 5.2 Alert Channels

**Configure notification channels:**

```yaml
# Slack
- channel: slack
  webhook: https://hooks.slack.com/services/YOUR/WEBHOOK/URL
  rules:
    - high_error_rate: moderate
    - slow_database: low
    - auth_failure_spike: critical

# Email
- channel: email
  recipients:
    - ops@scheduleright.org
  rules:
    - high_error_rate: digest_hourly
    - auth_failure_spike: immediate

# PagerDuty
- channel: pagerduty
  integration_key: ${PAGERDUTY_KEY}
  rules:
    - high_memory_usage: critical
    - database_down: critical
```

---

## 6. Health Checks

### 6.1 Liveness Probe

**Endpoint:** `GET /health`

```bash
curl -s http://localhost:3001/health | jq
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-16T12:34:56.000Z",
  "uptime": 3600.5
}
```

**Use in Kubernetes:**
```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3001
  initialDelaySeconds: 10
  periodSeconds: 10
```

### 6.2 Readiness Probe

**Endpoint:** `GET /readiness`

```bash
curl -s http://localhost:3001/readiness | jq
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-16T12:34:56.000Z",
  "checks": {
    "database": {
      "status": "healthy",
      "responseTime": 2
    },
    "redis": {
      "status": "healthy",
      "responseTime": 1
    },
    "twilio": {
      "status": "healthy",
      "responseTime": 250
    }
  }
}
```

**Use in Kubernetes:**
```yaml
readinessProbe:
  httpGet:
    path: /readiness
    port: 3001
  initialDelaySeconds: 30
  periodSeconds: 5
  failureThreshold: 2
```

### 6.3 Status Page

**Endpoint:** `GET /status`

Detailed service information for debugging.

---

## 7. Performance Monitoring

### 7.1 Database Performance

**Monitor query performance:**
```sql
-- MySQL: Check slow queries
SELECT query_time, lock_time, rows_examined, sql_text
FROM mysql.slow_log
ORDER BY query_time DESC
LIMIT 20;

-- Enable slow query log (if not already)
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;
```

**Set up alerts:**
- p95 query time > 500ms: warning
- p95 query time > 1s: critical
- Query timeout (>5s): alert immediately

### 7.2 API Response Times

**Key percentiles to monitor:**
- **p50 (median):** 50-100ms
- **p95:** 200-500ms
- **p99:** 500-1000ms
- **p99.9:** < 5s

**Alert thresholds:**
```yaml
warning:
  p95: 500ms
  p99: 1000ms
critical:
  p95: 1000ms
  p99: 2000ms
```

---

## 8. Daily Operations

### 8.1 Daily Checks

**Morning checklist:**
```bash
# 1. System health
curl -s http://api.scheduleright.org/readiness | jq .status

# 2. Error rate last 1h
curl -s http://api.scheduleright.org/metrics | jq '.errors.total'

# 3. Database connections
mysql -h $DB_HOST -e "SHOW PROCESSLIST;" | wc -l

# 4. Disk space
df -h /data/mysql

# 5. Recent errors in logs
docker logs scheduleright-api | grep ERROR | tail -20
```

### 8.2 Weekly Reports

Generate weekly summary:
```bash
#!/bin/bash
# Get stats from Prometheus

curl -s "http://prometheus:9090/api/v1/query_range?query=rate(http_requests_total[7d])&start=...&end=..." \
  | jq '.data.result[] | {metric, value}'

# Generate HTML report and email to ops team
```

---

## 9. Troubleshooting

### 9.1 High Latency

```bash
# Check database performance
curl http://localhost:3001/metrics | jq '.performance'

# Check slow queries
mysql -e "SELECT * FROM mysql.slow_log ORDER BY query_time DESC LIMIT 10;"

# Check connection pool
mysql -e "SHOW PROCESSLIST;" | grep scheduleright

# Solution: Add indexes, tune queries, or increase connections
```

### 9.2 Memory Leak

```bash
# Monitor memory over time
watch -n 5 'docker stats scheduleright-api --no-stream | grep MEMORY'

# Check logs for errors
docker logs --tail=1000 scheduleright-api | grep -i memory

# Restart container if persistent
docker restart scheduleright-api
```

### 9.3 High Error Rate

```bash
# Check error logs
curl http://localhost:3001/metrics | jq '.errors.byType'

# Check authentication failures
docker logs --tail=1000 scheduleright-api | grep UNAUTHORIZED

# Check validation errors
docker logs --tail=1000 scheduleright-api | grep VALIDATION_ERROR
```

---

## 10. Compliance & Audit

### 10.1 Logging Requirements

**HIPAA Compliance:**
- Log all access to patient data
- Include: timestamp, user ID, action, data accessed, result
- Retain for 6 years minimum
- Encrypt at rest and in transit

**SOC 2 Compliance:**
- All system changes logged
- Access logs retained
- Error logs monitored
- Security events alerted

### 10.2 Audit Trail

```typescript
// Automatic audit logging on sensitive operations
auditService.log({
  action: 'BOOKING_CREATED',
  userId: request.user.id,
  orgId: request.user.orgId,
  timestamp: new Date(),
  details: {
    bookingId: booking.id,
    clientId: booking.clientId,
  },
})
```

---

## Quick Start: Full Observability Stack

```bash
# 1. Spin up monitoring stack
docker-compose -f docker-compose.monitoring.yml up -d

# 2. Configure application
export LOG_LEVEL=info
export OTEL_ENABLED=true
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317

# 3. Start application
pnpm --filter @scheduleright/server run dev

# 4. Access dashboards
# Prometheus: http://localhost:9090
# Grafana: http://localhost:3000
# Jaeger: http://localhost:16686
# Kibana: http://localhost:5601
```

---

## References

- [OpenTelemetry Docs](https://opentelemetry.io/docs/)
- [Prometheus Docs](https://prometheus.io/docs/)
- [Grafana Docs](https://grafana.com/docs/)
- [ELK Stack](https://www.elastic.co/guide/index.html)
- [Jaeger Docs](https://www.jaegertracing.io/docs/)
- [Sentry Docs](https://docs.sentry.io/)

---

**Last Updated:** January 16, 2025  
**Version:** 1.0  
**Maintained By:** DevOps & Monitoring Team

