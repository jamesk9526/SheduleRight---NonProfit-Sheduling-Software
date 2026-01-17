# Disaster Recovery Runbook

**Last Updated:** January 16, 2026  
**Status:** Production Ready  
**Review Frequency:** Quarterly

---

## 🎯 Purpose

This runbook provides step-by-step procedures for backing up and restoring the ScheduleRight system in case of data loss, system failure, or disaster scenarios.

---

## 🗂️ Table of Contents

1. [Backup Procedures](#backup-procedures)
2. [Restore Procedures](#restore-procedures)
3. [Disaster Scenarios](#disaster-scenarios)
4. [Recovery Time Objectives](#recovery-time-objectives)
5. [Testing & Validation](#testing--validation)
6. [Contact Information](#contact-information)

---

## 📦 Backup Procedures

### MySQL Backups

#### Automated Daily Backup (Recommended)

```bash
#!/bin/bash
# backup-mysql.sh - Run daily via cron

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/mysql"
DB_NAME="scheduleright"

# Create backup directory
mkdir -p $BACKUP_DIR

# Dump database
mysqldump \
  --host=$MYSQL_HOST \
  --port=$MYSQL_PORT \
  --user=$MYSQL_USER \
  --password=$MYSQL_PASSWORD \
  --single-transaction \
  --routines \
  --triggers \
  --events \
  $DB_NAME | gzip > $BACKUP_DIR/scheduleright_$TIMESTAMP.sql.gz

# Keep last 30 days of backups
find $BACKUP_DIR -name "scheduleright_*.sql.gz" -mtime +30 -delete

echo "✅ MySQL backup completed: scheduleright_$TIMESTAMP.sql.gz"
```

**Setup Cron Job:**

```bash
# Run daily at 2 AM
0 2 * * * /path/to/backup-mysql.sh >> /var/log/mysql-backup.log 2>&1
```

#### Manual Backup

```bash
# Quick backup
mysqldump -h localhost -u root -p scheduleright > backup_$(date +%Y%m%d).sql

# Compressed backup
mysqldump -h localhost -u root -p scheduleright | gzip > backup_$(date +%Y%m%d).sql.gz

# Backup with structure only (no data)
mysqldump -h localhost -u root -p --no-data scheduleright > schema_backup.sql
```

### CouchDB Backups

#### Automated Daily Backup

```bash
#!/bin/bash
# backup-couchdb.sh - Run daily via cron

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/couchdb"
DB_NAME="scheduleright"

# Create backup directory
mkdir -p $BACKUP_DIR

# Dump CouchDB database
curl -X GET "http://$COUCHDB_USER:$COUCHDB_PASSWORD@localhost:5713/$DB_NAME/_all_docs?include_docs=true" \
  | gzip > $BACKUP_DIR/scheduleright_$TIMESTAMP.json.gz

# Keep last 30 days
find $BACKUP_DIR -name "scheduleright_*.json.gz" -mtime +30 -delete

echo "✅ CouchDB backup completed: scheduleright_$TIMESTAMP.json.gz"
```

#### Manual Backup with Replication

```bash
# Create replication target
curl -X PUT "http://admin:password@localhost:5713/scheduleright_backup"

# Replicate database
curl -X POST "http://admin:password@localhost:5713/_replicate" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "scheduleright",
    "target": "scheduleright_backup"
  }'
```

### Application Configuration Backup

```bash
#!/bin/bash
# backup-config.sh

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/config"

mkdir -p $BACKUP_DIR

# Backup environment files (excluding secrets if version controlled)
tar -czf $BACKUP_DIR/config_$TIMESTAMP.tar.gz \
  docker-compose.yml \
  .env.example \
  apps/server/src/db/mysql/schema.sql \
  apps/server/src/db/mysql/migrations/

echo "✅ Config backup completed: config_$TIMESTAMP.tar.gz"
```

### Backup Verification

```bash
# Verify MySQL backup integrity
gunzip -c backup.sql.gz | mysql -h localhost -u root -p --database=test_restore

# Verify CouchDB backup
gunzip -c backup.json.gz | jq '.rows | length'

# Check backup file size (should not be 0)
ls -lh /backups/mysql/
ls -lh /backups/couchdb/
```

---

## 🔄 Restore Procedures

### MySQL Restore

#### Full Database Restore

```bash
# 1. Stop the application
docker-compose stop server web

# 2. Drop existing database (CAUTION!)
mysql -h localhost -u root -p -e "DROP DATABASE IF EXISTS scheduleright;"

# 3. Create fresh database
mysql -h localhost -u root -p -e "CREATE DATABASE scheduleright CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 4. Restore from backup
gunzip -c scheduleright_20260116_020000.sql.gz | mysql -h localhost -u root -p scheduleright

# 5. Verify restore
mysql -h localhost -u root -p scheduleright -e "SHOW TABLES; SELECT COUNT(*) FROM users;"

# 6. Restart application
docker-compose start server web
```

#### Selective Table Restore

```bash
# Extract specific table from backup
gunzip -c backup.sql.gz | sed -n '/CREATE TABLE `bookings`/,/CREATE TABLE/p' > bookings_only.sql

# Restore single table
mysql -h localhost -u root -p scheduleright < bookings_only.sql
```

### CouchDB Restore

#### Full Database Restore

```bash
# 1. Stop application
docker-compose stop server web

# 2. Delete existing database
curl -X DELETE "http://admin:password@localhost:5713/scheduleright"

# 3. Recreate database
curl -X PUT "http://admin:password@localhost:5713/scheduleright"

# 4. Restore documents
gunzip -c scheduleright_20260116_020000.json.gz | \
  jq '.rows[] | .doc | del(._rev)' | \
  curl -X POST "http://admin:password@localhost:5713/scheduleright/_bulk_docs" \
    -H "Content-Type: application/json" \
    -d @-

# 5. Rebuild indexes
node apps/server/dist/db/indexes.js

# 6. Restart application
docker-compose start server web
```

#### Point-in-Time Recovery

```bash
# Restore to specific date (filter documents by timestamp)
gunzip -c backup.json.gz | \
  jq '.rows[] | select(.doc.createdAt <= "2026-01-16T00:00:00Z") | .doc | del(._rev)' | \
  curl -X POST "http://admin:password@localhost:5713/scheduleright/_bulk_docs" \
    -H "Content-Type: application/json" \
    -d @-
```

### Configuration Restore

```bash
# Extract and restore configuration
tar -xzf config_20260116_020000.tar.gz

# Verify environment variables
cp .env.example .env.local
# Edit .env.local with production values

# Apply database migrations
pnpm --filter server db:migrate
```

---

## 🚨 Disaster Scenarios

### Scenario 1: Database Corruption

**Symptoms:**
- Application errors on database queries
- Data inconsistency
- Failed transactions

**Recovery Steps:**

1. **Assess damage:**
   ```bash
   # MySQL
   mysqlcheck -h localhost -u root -p --check scheduleright
   
   # CouchDB
   curl "http://admin:password@localhost:5713/scheduleright/_ensure_full_commit"
   ```

2. **Stop application:**
   ```bash
   docker-compose stop server web
   ```

3. **Restore from latest backup** (see MySQL or CouchDB restore above)

4. **Verify data integrity:**
   ```bash
   # Check critical tables/documents
   mysql -h localhost -u root -p scheduleright -e "SELECT COUNT(*) FROM users; SELECT COUNT(*) FROM bookings;"
   ```

5. **Restart application:**
   ```bash
   docker-compose start server web
   ```

**Recovery Time:** 15-30 minutes  
**Data Loss:** Up to 24 hours (depending on backup frequency)

---

### Scenario 2: Complete Server Failure

**Symptoms:**
- Server unresponsive
- Hardware failure
- Operating system crash

**Recovery Steps:**

1. **Provision new server** with same specifications

2. **Install dependencies:**
   ```bash
   # Install Docker, Node.js, pnpm
   curl -fsSL https://get.docker.com | sh
   curl -fsSL https://get.pnpm.io/install.sh | sh -
   ```

3. **Clone repository:**
   ```bash
   git clone https://github.com/jamesk9526/scheduleright---NonProfit-Sheduling-Software.git
   cd scheduleright---NonProfit-Sheduling-Software
   ```

4. **Restore configuration:**
   ```bash
   tar -xzf /backups/config/config_latest.tar.gz
   cp .env.example .env.local
   # Configure .env.local with production values
   ```

5. **Restore database** (see Database Restore procedures above)

6. **Install and start:**
   ```bash
   pnpm install
   docker-compose up -d
   pnpm dev
   ```

7. **Verify services:**
   ```bash
   curl http://localhost:5710/health
   curl http://localhost:5711
   ```

**Recovery Time:** 1-2 hours  
**Data Loss:** Up to 24 hours

---

### Scenario 3: Data Center Outage

**Symptoms:**
- Complete infrastructure unavailable
- Network connectivity loss
- Multiple system failures

**Recovery Steps:**

1. **Activate DR site** (if configured) or provision cloud infrastructure

2. **Deploy from backups:**
   ```bash
   # Download backups from offsite storage (S3, Azure, etc.)
   aws s3 sync s3://scheduleright-backups/latest /tmp/backups/
   ```

3. **Follow "Complete Server Failure" recovery steps** on new infrastructure

4. **Update DNS** to point to new location:
   ```bash
   # Update A records for scheduleright.com
   # Update CNAME for api.scheduleright.com
   ```

5. **Notify users** of service restoration

**Recovery Time:** 2-4 hours  
**Data Loss:** Up to 24 hours

---

### Scenario 4: Accidental Data Deletion

**Symptoms:**
- User reports missing data
- Specific records deleted accidentally
- Batch operation error

**Recovery Steps:**

1. **Identify affected data:**
   ```bash
   # Check audit logs
   mysql -h localhost -u root -p scheduleright -e \
     "SELECT * FROM audit_logs WHERE action = 'delete' AND created_at > '2026-01-16 00:00:00' ORDER BY created_at DESC LIMIT 100;"
   ```

2. **Extract from backup:**
   ```bash
   # For specific records, export from backup
   gunzip -c backup.sql.gz | grep "INSERT INTO users VALUES (123," > deleted_user.sql
   ```

3. **Restore specific records:**
   ```bash
   mysql -h localhost -u root -p scheduleright < deleted_user.sql
   ```

4. **Verify restoration:**
   ```bash
   mysql -h localhost -u root -p scheduleright -e "SELECT * FROM users WHERE id = 123;"
   ```

**Recovery Time:** 15-60 minutes  
**Data Loss:** Only affected records

---

## ⏱️ Recovery Time Objectives (RTO)

| Scenario | Target RTO | Maximum Data Loss (RPO) |
|----------|-----------|-------------------------|
| Database corruption | 30 minutes | 24 hours |
| Single service failure | 15 minutes | None |
| Complete server failure | 2 hours | 24 hours |
| Data center outage | 4 hours | 24 hours |
| Accidental deletion | 1 hour | Specific records only |

### Improving RTO/RPO

**For Production:**
1. **Increase backup frequency** to hourly or continuous replication
2. **Set up hot standby** database with real-time replication
3. **Use managed database services** (AWS RDS, Azure Database)
4. **Implement automated failover**
5. **Configure CDN and load balancing** for redundancy

---

## ✅ Testing & Validation

### Quarterly DR Test

Run this test every quarter to validate procedures:

```bash
#!/bin/bash
# dr-test.sh - Quarterly disaster recovery drill

echo "🧪 Starting DR Test..."

# 1. Create test environment
docker-compose -f docker-compose.test.yml up -d

# 2. Restore latest backup to test environment
gunzip -c /backups/mysql/latest.sql.gz | mysql -h localhost -P 3307 -u root -p scheduleright_test

# 3. Verify data integrity
TEST_COUNT=$(mysql -h localhost -P 3307 -u root -p scheduleright_test -e "SELECT COUNT(*) FROM users;" | tail -1)
echo "✓ Test database has $TEST_COUNT users"

# 4. Test application startup
curl http://localhost:3002/health

# 5. Cleanup
docker-compose -f docker-compose.test.yml down

echo "✅ DR Test completed successfully"
```

### Monthly Backup Verification

```bash
#!/bin/bash
# verify-backups.sh - Run monthly

BACKUP_DIR="/backups"

echo "🔍 Verifying backups..."

# Check MySQL backups
MYSQL_LATEST=$(ls -t $BACKUP_DIR/mysql/*.sql.gz | head -1)
MYSQL_SIZE=$(du -h $MYSQL_LATEST | cut -f1)
echo "✓ Latest MySQL backup: $MYSQL_LATEST ($MYSQL_SIZE)"

# Check CouchDB backups
COUCH_LATEST=$(ls -t $BACKUP_DIR/couchdb/*.json.gz | head -1)
COUCH_SIZE=$(du -h $COUCH_LATEST | cut -f1)
echo "✓ Latest CouchDB backup: $COUCH_LATEST ($COUCH_SIZE)"

# Check backup age
BACKUP_AGE=$(find $BACKUP_DIR/mysql -name "*.sql.gz" -mtime -1 | wc -l)
if [ $BACKUP_AGE -eq 0 ]; then
  echo "⚠️ WARNING: No backups in last 24 hours!"
  exit 1
fi

echo "✅ All backups verified"
```

---

## 📞 Contact Information

### Escalation Chain

| Level | Role | Contact | Availability |
|-------|------|---------|--------------|
| 1 | On-Call Engineer | oncall@scheduleright.com | 24/7 |
| 2 | DevOps Lead | devops-lead@scheduleright.com | Business hours |
| 3 | CTO | cto@scheduleright.com | Emergency only |

### External Vendors

| Service | Contact | Purpose |
|---------|---------|---------|
| Hosting Provider | support@hosting.com | Infrastructure issues |
| Database Support | dba@support.com | Database recovery |
| Twilio Support | support.twilio.com | SMS service restoration |

---

## 📋 Checklist: Disaster Recovery

Use this checklist during an actual disaster:

- [ ] **Incident declared** - Document start time
- [ ] **Stakeholders notified** - Email/SMS sent
- [ ] **Assess damage** - Identify affected systems
- [ ] **Stop application** - Prevent further damage
- [ ] **Identify root cause** - Database, server, network?
- [ ] **Select recovery procedure** - Choose appropriate scenario
- [ ] **Execute restore** - Follow runbook steps
- [ ] **Verify restoration** - Run health checks
- [ ] **Test functionality** - Smoke tests
- [ ] **Resume service** - Start application
- [ ] **Monitor closely** - Watch for issues
- [ ] **Document incident** - Post-mortem report
- [ ] **Update runbook** - Incorporate learnings

---

## 📚 Additional Resources

- [MySQL Backup Documentation](https://dev.mysql.com/doc/refman/8.0/en/backup-and-recovery.html)
- [CouchDB Replication Guide](https://docs.couchdb.org/en/stable/replication/intro.html)
- [Docker Backup Best Practices](https://docs.docker.com/storage/volumes/#backup-restore-or-migrate-data-volumes)
- [AWS Disaster Recovery](https://aws.amazon.com/disaster-recovery/)

---

## 🔄 Revision History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2026-01-16 | 1.0 | Initial version | Development Team |

---

**Last Review:** January 16, 2026  
**Next Review:** April 16, 2026  
**Status:** ✅ Active
