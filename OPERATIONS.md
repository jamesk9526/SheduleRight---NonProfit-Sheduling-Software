# ScheduleRight Operations Manual

**Last Updated:** January 16, 2026  
**Version:** 1.0

---

## Table of Contents

1. [Daily Operations](#daily-operations)
2. [Weekly Tasks](#weekly-tasks)
3. [Monthly Tasks](#monthly-tasks)
4. [Incident Response](#incident-response)
5. [Escalation Procedures](#escalation-procedures)
6. [Monitoring Dashboard](#monitoring-dashboard)
7. [Maintenance Windows](#maintenance-windows)

---

## Daily Operations

### Morning Health Check (15 minutes)

**Perform every morning at 9:00 AM:**

```bash
#!/bin/bash
# daily-check.sh

echo "=== ScheduleRight Daily Health Check ==="
echo "Date: $(date)"
echo ""

# 1. Check service status
echo "1. Service Status:"
pm2 status
echo ""

# 2. Health endpoint
echo "2. Health Check:"
curl -s http://localhost:5710/health | jq
echo ""

# 3. Readiness check
echo "3. Readiness Check:"
curl -s http://localhost:5710/readiness | jq
echo ""

# 4. Check disk space
echo "4. Disk Space:"
df -h | grep -E '(Filesystem|/dev/)'
echo ""

# 5. Check memory usage
echo "5. Memory Usage:"
free -h
echo ""

# 6. Recent errors (last hour)
echo "6. Recent Errors (last hour):"
pm2 logs --err --lines 20 --nostream | grep -i error | tail -10
echo ""

# 7. Active users (from audit logs)
echo "7. Active Users (last 24h):"
curl -s http://admin:password@localhost:5713/scheduleright/_find \
  -H "Content-Type: application/json" \
  -d '{
    "selector": {
      "type": "audit",
      "action": "user.login",
      "timestamp": {"$gte": "'$(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%S)'"}
    },
    "fields": ["userId", "timestamp"],
    "limit": 100
  }' | jq -r '.docs | group_by(.userId) | length'
echo " unique users logged in"
echo ""

# 8. Booking statistics (last 24h)
echo "8. Bookings (last 24h):"
curl -s http://admin:password@localhost:5713/scheduleright/_find \
  -H "Content-Type: application/json" \
  -d '{
    "selector": {
      "type": "booking",
      "createdAt": {"$gte": "'$(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%S)'"}
    },
    "fields": ["status"],
    "limit": 1000
  }' | jq -r '.docs | group_by(.status) | map({status: .[0].status, count: length})'
echo ""

# 9. Performance metrics
echo "9. Performance (slowest endpoints):"
curl -s http://localhost:5710/metrics | jq -r '.endpoints | to_entries | sort_by(.value.avgDuration) | reverse | .[0:5] | .[] | "\(.key): \(.value.avgDuration)ms avg"'
echo ""

# 10. Backup status
echo "10. Backup Status:"
LAST_BACKUP=$(ls -t /var/backups/scheduleright/*.json.gz 2>/dev/null | head -1)
if [ -n "$LAST_BACKUP" ]; then
    BACKUP_AGE=$(( ($(date +%s) - $(stat -c %Y "$LAST_BACKUP")) / 3600 ))
    BACKUP_SIZE=$(du -h "$LAST_BACKUP" | cut -f1)
    echo "Last backup: $(basename $LAST_BACKUP)"
    echo "Age: $BACKUP_AGE hours"
    echo "Size: $BACKUP_SIZE"
    
    if [ $BACKUP_AGE -gt 25 ]; then
        echo "⚠️  WARNING: Backup is older than 24 hours!"
    else
        echo "✅ Backup is current"
    fi
else
    echo "❌ No backups found!"
fi
echo ""

echo "=== Health Check Complete ==="
```

**Daily Checklist:**

- [ ] Run health check script
- [ ] Verify all services are running (PM2 status)
- [ ] Check for error spikes in logs
- [ ] Verify backup completed successfully
- [ ] Check disk space (>20% free)
- [ ] Review active user count
- [ ] Check booking activity
- [ ] Verify no performance degradation

**Alert Thresholds:**
- ❌ Any service down → Escalate immediately
- ⚠️ Disk space <20% → Plan cleanup
- ⚠️ Memory usage >85% → Investigate
- ⚠️ Backup >25 hours old → Check backup cron
- ⚠️ Errors >100/hour → Investigate

---

## Weekly Tasks

### Monday: Security & Updates (30 minutes)

**1. Security Updates:**
```bash
# Check for security updates
sudo apt update
sudo apt list --upgradable

# Apply security patches (requires testing first)
sudo apt upgrade -y

# Update Node.js packages
cd /opt/scheduleright
pnpm audit
pnpm update
```

**2. Review Access Logs:**
```bash
# Check failed login attempts
curl http://admin:password@localhost:5713/scheduleright/_find \
  -H "Content-Type: application/json" \
  -d '{
    "selector": {
      "type": "audit",
      "action": "user.login_failed",
      "timestamp": {"$gte": "'$(date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%S)'"}
    },
    "limit": 100
  }' | jq -r '.docs[] | "\(.timestamp) \(.ipAddress) \(.details.email)"'

# Check for suspicious IPs (>10 failed logins)
# Investigate and potentially block with firewall
```

**3. Certificate Renewal:**
```bash
# Check SSL certificate expiry
sudo certbot certificates

# Test auto-renewal
sudo certbot renew --dry-run
```

**Weekly Checklist:**
- [ ] Apply security updates
- [ ] Review failed login attempts
- [ ] Check SSL certificate expiry
- [ ] Review audit logs for unusual activity
- [ ] Update NPM packages (after testing)
- [ ] Check firewall rules
- [ ] Review rate limit logs

---

### Wednesday: Performance Review (45 minutes)

**1. Performance Metrics:**
```bash
# Get performance summary
curl http://localhost:5710/metrics | jq '.summary'

# Identify slow endpoints (>1000ms avg)
curl http://localhost:5710/metrics | \
  jq -r '.endpoints | to_entries[] | select(.value.avgDuration > 1000) | "\(.key): \(.value.avgDuration)ms"'

# Check p95/p99 latencies
curl http://localhost:5710/metrics | \
  jq -r '.endpoints | to_entries[] | "\(.key): p95=\(.value.p95)ms, p99=\(.value.p99)ms"' | \
  sort -t'=' -k2 -n | tail -10
```

**2. Database Performance:**
```bash
# Database size and document count
curl http://admin:password@localhost:5713/scheduleright | \
  jq '{doc_count, disk_size_mb: (.disk_size / 1024 / 1024 | round)}'

# Compact database if needed
curl -X POST http://admin:password@localhost:5713/scheduleright/_compact

# Check index usage
cd /opt/scheduleright/apps/server
npm run db:indexes:list
```

**3. Resource Usage Trends:**
```bash
# Monitor system resources over time
pm2 monit  # Interactive monitoring

# Check historical CPU/memory (if monitoring enabled)
# Export metrics for analysis
```

**Performance Checklist:**
- [ ] Review endpoint performance metrics
- [ ] Identify and optimize slow queries
- [ ] Check database size and compact if needed
- [ ] Review index usage
- [ ] Monitor memory/CPU trends
- [ ] Check for memory leaks
- [ ] Plan capacity upgrades if needed

---

### Friday: Backup Verification (20 minutes)

**1. Verify Backups:**
```bash
# List recent backups
ls -lh /var/backups/scheduleright/ | tail -10

# Check backup sizes (should be consistent)
du -h /var/backups/scheduleright/*.json.gz | tail -7

# Verify backup integrity
gunzip -t /var/backups/scheduleright/scheduleright-latest.json.gz
```

**2. Test Restore (Monthly):**
```bash
# Run restore test to temporary database (see BACKUP.md)
/opt/scheduleright/test-restore.sh
```

**3. Offsite Backup:**
```bash
# Verify S3 sync (if enabled)
aws s3 ls s3://your-bucket/scheduleright/ --recursive | tail -10

# Check remote backup age
# Should match local backup schedule
```

**Backup Checklist:**
- [ ] Verify daily backups ran successfully
- [ ] Check backup file sizes
- [ ] Test backup integrity (decompress)
- [ ] Verify offsite copy (S3/remote)
- [ ] Review backup logs for errors
- [ ] Confirm backup retention policy
- [ ] Document any backup failures

---

## Monthly Tasks

### First Monday: Comprehensive Review (2 hours)

**1. Audit Log Review:**
```bash
# User activity summary
curl http://admin:password@localhost:5713/scheduleright/_find \
  -H "Content-Type: application/json" \
  -d '{
    "selector": {
      "type": "audit",
      "timestamp": {"$gte": "'$(date -u -d '30 days ago' +%Y-%m-%dT%H:%M:%S)'"}
    },
    "limit": 10000
  }' | jq -r '.docs | group_by(.action) | map({action: .[0].action, count: length}) | sort_by(.count) | reverse'

# High-risk actions (deletions, role changes)
curl http://admin:password@localhost:5713/scheduleright/_find \
  -H "Content-Type: application/json" \
  -d '{
    "selector": {
      "type": "audit",
      "action": {"$in": ["org.delete", "site.delete", "user.delete", "user.role_change"]},
      "timestamp": {"$gte": "'$(date -u -d '30 days ago' +%Y-%m-%dT%H:%M:%S)'"}
    },
    "limit": 100
  }' | jq -r '.docs[] | "\(.timestamp) \(.action) \(.userId) \(.resourceId)"'
```

**2. Performance Analysis:**
```bash
# Monthly performance report
echo "=== Monthly Performance Report ===" > /var/log/scheduleright/monthly-$(date +%Y%m).txt
curl http://localhost:5710/metrics >> /var/log/scheduleright/monthly-$(date +%Y%m).txt

# Identify trends
# Compare with previous month
# Plan optimizations
```

**3. Capacity Planning:**
```bash
# Database growth rate
DB_SIZE_NOW=$(curl -s http://admin:password@localhost:5713/scheduleright | jq '.disk_size')
# Compare with last month
# Calculate monthly growth rate
# Estimate when disk will be full

# User growth
USERS_NOW=$(curl -s http://admin:password@localhost:5713/scheduleright/_find \
  -H "Content-Type: application/json" \
  -d '{"selector":{"type":"user"},"fields":["_id"],"limit":10000}' | jq '.docs | length')

echo "Current users: $USERS_NOW"
echo "Database size: $(($DB_SIZE_NOW / 1024 / 1024)) MB"
```

**4. User Access Audit:**
```bash
# List all users and last login
curl http://admin:password@localhost:5713/scheduleright/_find \
  -H "Content-Type: application/json" \
  -d '{
    "selector": {"type": "user"},
    "fields": ["email", "name", "role", "lastLoginAt"],
    "limit": 1000
  }' | jq -r '.docs[] | "\(.email) \(.role) \(.lastLoginAt // "never")"'

# Identify inactive users (no login in 90 days)
# Consider deactivating or removing
```

**Monthly Checklist:**
- [ ] Review audit logs (last 30 days)
- [ ] Analyze performance trends
- [ ] Update capacity planning spreadsheet
- [ ] Review user access and permissions
- [ ] Check for inactive users
- [ ] Review and update documentation
- [ ] Plan infrastructure upgrades (if needed)
- [ ] Security assessment
- [ ] Review backup strategy
- [ ] Test disaster recovery plan

---

## Incident Response

### Severity Levels

**P1 - Critical (Complete Outage):**
- Service completely down
- Data loss risk
- Security breach
- **Response Time:** Immediate
- **Resolution Time:** 1 hour

**P2 - High (Degraded Service):**
- Performance severely degraded
- Key features unavailable
- Authentication issues
- **Response Time:** 15 minutes
- **Resolution Time:** 4 hours

**P3 - Medium (Partial Impact):**
- Non-critical features affected
- Performance issues
- Intermittent errors
- **Response Time:** 1 hour
- **Resolution Time:** 24 hours

**P4 - Low (Minimal Impact):**
- Cosmetic issues
- Documentation errors
- **Response Time:** Next business day
- **Resolution Time:** 1 week

---

### Incident Response Checklist

**When incident occurs:**

1. **Acknowledge (within 5 min):**
   - [ ] Log incident in tracking system
   - [ ] Assign severity level
   - [ ] Notify team

2. **Assess (within 10 min):**
   - [ ] Check service status: `pm2 status`
   - [ ] Check health: `curl http://localhost:5710/health`
   - [ ] Review recent logs: `pm2 logs --err --lines 50`
   - [ ] Check recent changes (deployments, configs)

3. **Communicate:**
   - [ ] Notify users (if P1/P2)
   - [ ] Post status update
   - [ ] Update every 30 minutes

4. **Mitigate:**
   - [ ] Stop the bleeding (rollback, restart, etc.)
   - [ ] Document steps taken
   - [ ] Preserve evidence (logs, screenshots)

5. **Resolve:**
   - [ ] Implement fix
   - [ ] Verify resolution
   - [ ] Monitor for recurrence

6. **Post-Mortem (within 24h for P1/P2):**
   - [ ] Root cause analysis
   - [ ] Timeline of events
   - [ ] What went well / What went wrong
   - [ ] Action items to prevent recurrence

---

### Common Incident Playbooks

**Service Down:**
```bash
# 1. Check PM2
pm2 status
pm2 logs --err --lines 50

# 2. Try restart
pm2 restart all

# 3. If restart fails, check logs
pm2 logs scheduleright-server --lines 100

# 4. Check database
curl http://localhost:5713
sudo systemctl status couchdb

# 5. Check environment
cd /opt/scheduleright/apps/server
cat .env | grep -v PASSWORD | grep -v SECRET

# 6. If all else fails, restore from backup
# See BACKUP.md for restore procedures
```

**Performance Degradation:**
```bash
# 1. Check current performance
curl http://localhost:5710/metrics | jq '.summary'

# 2. Identify slow endpoints
curl http://localhost:5710/metrics | jq -r '.endpoints | to_entries[] | select(.value.avgDuration > 1000) | "\(.key): \(.value.avgDuration)ms"'

# 3. Check system resources
pm2 monit
htop

# 4. Check database
curl http://admin:password@localhost:5713/scheduleright | jq

# 5. Restart services
pm2 restart all

# 6. Monitor for improvement
watch -n 5 'curl -s http://localhost:5710/metrics | jq .summary'
```

**Database Issues:**
```bash
# 1. Check CouchDB status
sudo systemctl status couchdb
curl http://localhost:5713

# 2. Check database connection from app
curl http://localhost:5710/health

# 3. Check CouchDB logs
sudo tail -f /var/log/couchdb/couchdb.log

# 4. Restart CouchDB
sudo systemctl restart couchdb

# 5. If corrupted, restore from backup
# See BACKUP.md
```

---

## Escalation Procedures

### Escalation Path

**Level 1: On-Call Engineer**
- First responder
- Handles P3/P4 incidents
- Escalates P1/P2 within 15 minutes

**Level 2: Senior Engineer / Team Lead**
- Complex troubleshooting
- Architecture decisions
- Handles P1/P2 incidents

**Level 3: Engineering Manager / CTO**
- Critical business impact
- External communication
- Resource allocation

### Contact Information

```
Level 1: On-Call Engineer
  Phone: XXX-XXX-XXXX
  Email: oncall@example.com
  Slack: @oncall

Level 2: Team Lead
  Phone: XXX-XXX-XXXX
  Email: teamlead@example.com
  Slack: @teamlead

Level 3: Engineering Manager
  Phone: XXX-XXX-XXXX
  Email: manager@example.com
  Slack: @manager

External Contacts:
  CouchDB Support: support@couchdb.com
  Hosting Provider: support@provider.com
```

---

## Monitoring Dashboard

### Key Metrics to Track

**Service Health:**
- Uptime %
- Response time (p50, p95, p99)
- Error rate
- Request rate

**System Resources:**
- CPU usage %
- Memory usage %
- Disk usage %
- Network I/O

**Application Metrics:**
- Active users
- Bookings per day
- API calls per minute
- Database queries per second

**Business Metrics:**
- New users (daily/weekly)
- Active organizations
- Booking completion rate
- Revenue (if applicable)

### Alerting Rules

```yaml
# Example alerting configuration

# Service down
- alert: ServiceDown
  condition: health_check == false
  duration: 1m
  severity: P1
  action: Page on-call

# High error rate
- alert: HighErrorRate
  condition: error_rate > 5%
  duration: 5m
  severity: P2
  action: Notify team

# Slow response time
- alert: SlowResponseTime
  condition: p95_latency > 2000ms
  duration: 10m
  severity: P3
  action: Create ticket

# Disk space low
- alert: DiskSpaceLow
  condition: disk_usage > 80%
  duration: 1h
  severity: P3
  action: Notify team
```

---

## Maintenance Windows

### Scheduled Maintenance

**Monthly Maintenance Window:**
- **When:** Last Sunday of month, 2:00 AM - 6:00 AM
- **Duration:** Up to 4 hours
- **Notification:** 1 week advance notice to users

**Maintenance Tasks:**
- System updates (OS, security patches)
- Database maintenance (compact, reindex)
- Application updates
- Backup testing
- Performance optimization

### Emergency Maintenance

**When required:**
- Critical security patches
- Data corruption risk
- Service instability

**Procedure:**
1. Assess urgency and impact
2. Get approval (Manager/CTO)
3. Notify users (minimum 1 hour notice if possible)
4. Execute maintenance
5. Verify and monitor
6. Send completion notification

---

## Runbook Quick Reference

**Check service status:**
```bash
pm2 status
curl http://localhost:5710/health
```

**View logs:**
```bash
pm2 logs
pm2 logs --err
pm2 logs scheduleright-server --lines 100
```

**Restart services:**
```bash
pm2 restart all
pm2 restart scheduleright-server
```

**Check performance:**
```bash
curl http://localhost:5710/metrics | jq '.summary'
pm2 monit
```

**Database health:**
```bash
curl http://localhost:5713
curl http://admin:password@localhost:5713/scheduleright
```

**Deploy update:**
```bash
/opt/scheduleright/deploy.sh
```

**Backup now:**
```bash
/opt/scheduleright/backup.sh
```

**Restore from backup:**
```bash
# See BACKUP.md for full procedures
```

---

## Documentation Index

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment procedures
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Common issues and solutions
- [BACKUP.md](./BACKUP.md) - Backup and restore procedures
- [OPERATIONS.md](./OPERATIONS.md) - This document
- [GITHUB_COPILOT_TODO.md](./GITHUB_COPILOT_TODO.md) - Project roadmap

---

**Remember:** When in doubt, check the docs, check the logs, and don't be afraid to escalate!
