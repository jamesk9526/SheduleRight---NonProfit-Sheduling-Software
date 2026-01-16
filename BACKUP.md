# ScheduleRight Backup & Restore Procedures

**Last Updated:** January 16, 2026  
**Version:** 1.0

---

## Table of Contents

1. [Overview](#overview)
2. [Backup Strategy](#backup-strategy)
3. [Manual Backup](#manual-backup)
4. [Automated Backup Script](#automated-backup-script)
5. [Restore Procedures](#restore-procedures)
6. [Disaster Recovery](#disaster-recovery)
7. [Backup Verification](#backup-verification)

---

## Overview

Regular backups are **critical** for data protection and disaster recovery. ScheduleRight stores all data in CouchDB, which must be backed up regularly.

### What Gets Backed Up

- **CouchDB Database:** All application data (users, organizations, sites, bookings, availability)
- **Environment Files:** Configuration (`.env` files)
- **Uploaded Files:** Any user-uploaded content (if applicable)

### Backup Retention Policy

- **Daily backups:** Keep for 7 days
- **Weekly backups:** Keep for 4 weeks  
- **Monthly backups:** Keep for 12 months

---

## Backup Strategy

### Option 1: CouchDB Replication (Recommended)

**Continuous replication to backup CouchDB instance:**

```bash
# Setup continuous replication
curl -X POST http://admin:password@localhost:5984/_replicate \
  -H "Content-Type: application/json" \
  -d '{
    "source": "http://admin:password@localhost:5984/scheduleright",
    "target": "http://admin:password@backup-server:5984/scheduleright",
    "continuous": true,
    "create_target": true
  }'

# Check replication status
curl http://admin:password@localhost:5984/_active_tasks
```

**Advantages:**
- ✅ Real-time replication
- ✅ Near-zero RPO (Recovery Point Objective)
- ✅ Easy failover
- ✅ No downtime during backup

**Disadvantages:**
- ❌ Requires second CouchDB instance
- ❌ Additional infrastructure cost

---

### Option 2: Database Dump (Simple)

**Export database to JSON file:**

```bash
# Full database export
curl http://admin:password@localhost:5984/scheduleright/_all_docs?include_docs=true \
  > backup-$(date +%Y%m%d-%H%M%S).json

# Compress backup
gzip backup-*.json
```

**Advantages:**
- ✅ Simple and portable
- ✅ No additional infrastructure
- ✅ Easy to store offsite

**Disadvantages:**
- ❌ Database must be stopped (or inconsistent backup)
- ❌ Larger file size than replication
- ❌ Slower restore process

---

## Manual Backup

### Full Database Backup

```bash
#!/bin/bash
# Manual backup script

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="/var/backups/scheduleright"
DB_NAME="scheduleright"
COUCHDB_USER="admin"
COUCHDB_PASSWORD="your-password"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
echo "Backing up database: $DB_NAME"
curl -s http://$COUCHDB_USER:$COUCHDB_PASSWORD@localhost:5984/$DB_NAME/_all_docs?include_docs=true \
  > $BACKUP_DIR/db-$TIMESTAMP.json

# Compress backup
echo "Compressing backup..."
gzip $BACKUP_DIR/db-$TIMESTAMP.json

# Backup environment files
echo "Backing up environment files..."
cp /opt/scheduleright/apps/server/.env $BACKUP_DIR/server-env-$TIMESTAMP
cp /opt/scheduleright/apps/web/.env.local $BACKUP_DIR/web-env-$TIMESTAMP 2>/dev/null || true

# Create backup manifest
echo "Creating manifest..."
cat > $BACKUP_DIR/manifest-$TIMESTAMP.txt << EOF
Backup Date: $(date)
Database: $DB_NAME
Files:
  - db-$TIMESTAMP.json.gz
  - server-env-$TIMESTAMP
  - web-env-$TIMESTAMP
EOF

echo "✅ Backup complete: $BACKUP_DIR/db-$TIMESTAMP.json.gz"
ls -lh $BACKUP_DIR/db-$TIMESTAMP.json.gz
```

### Backup Specific Database

```bash
# Backup single document type (e.g., bookings only)
curl http://admin:password@localhost:5984/scheduleright/_find \
  -H "Content-Type: application/json" \
  -d '{
    "selector": {"type": "booking"},
    "limit": 999999
  }' > bookings-backup.json
```

---

## Automated Backup Script

Create `/opt/scheduleright/backup.sh`:

```bash
#!/bin/bash
# Automated backup script with rotation

set -e  # Exit on error

# Configuration
BACKUP_DIR="/var/backups/scheduleright"
LOG_FILE="/var/log/scheduleright-backup.log"
RETENTION_DAYS=30
DB_NAME="scheduleright"
COUCHDB_USER="admin"
COUCHDB_PASSWORD="<your-password>"

# S3 Configuration (optional)
S3_BUCKET="s3://your-backup-bucket/scheduleright"
ENABLE_S3_UPLOAD=false  # Set to true to enable

# Create backup directory
mkdir -p $BACKUP_DIR

# Log function
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

log "=== Starting backup ==="

# Generate timestamp
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/scheduleright-$TIMESTAMP.json"

# Backup database
log "Backing up database: $DB_NAME"
if curl -sf http://$COUCHDB_USER:$COUCHDB_PASSWORD@localhost:5984/$DB_NAME/_all_docs?include_docs=true > $BACKUP_FILE; then
    log "✅ Database backup successful"
else
    log "❌ Database backup failed"
    exit 1
fi

# Compress backup
log "Compressing backup..."
gzip $BACKUP_FILE
BACKUP_FILE="$BACKUP_FILE.gz"

# Calculate backup size
BACKUP_SIZE=$(du -h $BACKUP_FILE | cut -f1)
log "Backup size: $BACKUP_SIZE"

# Backup environment files
log "Backing up environment files..."
tar -czf $BACKUP_DIR/env-$TIMESTAMP.tar.gz \
    -C /opt/scheduleright/apps/server .env \
    -C /opt/scheduleright/apps/web .env.local 2>/dev/null || true

# Upload to S3 (if enabled)
if [ "$ENABLE_S3_UPLOAD" = true ]; then
    log "Uploading to S3..."
    if aws s3 cp $BACKUP_FILE $S3_BUCKET/$(basename $BACKUP_FILE); then
        log "✅ S3 upload successful"
    else
        log "⚠️  S3 upload failed (continuing...)"
    fi
fi

# Remove old backups
log "Cleaning up old backups (older than $RETENTION_DAYS days)..."
find $BACKUP_DIR -name "scheduleright-*.json.gz" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR -name "env-*.tar.gz" -mtime +$RETENTION_DAYS -delete
REMAINING_BACKUPS=$(ls -1 $BACKUP_DIR/scheduleright-*.json.gz 2>/dev/null | wc -l)
log "Remaining backups: $REMAINING_BACKUPS"

log "=== Backup complete ==="
log ""
```

Make it executable:

```bash
chmod +x /opt/scheduleright/backup.sh
```

### Schedule Automated Backups with Cron

```bash
# Edit crontab
crontab -e

# Add backup schedule:

# Daily backup at 2:00 AM
0 2 * * * /opt/scheduleright/backup.sh

# Weekly backup (Sundays at 3:00 AM)
0 3 * * 0 /opt/scheduleright/backup.sh

# Hourly backup (every hour at :30)
30 * * * * /opt/scheduleright/backup.sh
```

### Verify Cron Job

```bash
# List cron jobs
crontab -l

# Check cron logs
sudo tail -f /var/log/syslog | grep CRON

# Check backup logs
tail -f /var/log/scheduleright-backup.log
```

---

## Restore Procedures

### Full Database Restore

```bash
#!/bin/bash
# Restore from backup

BACKUP_FILE="/var/backups/scheduleright/scheduleright-20260116-020000.json.gz"
DB_NAME="scheduleright"
COUCHDB_USER="admin"
COUCHDB_PASSWORD="your-password"

echo "⚠️  WARNING: This will delete the current database!"
read -p "Are you sure you want to restore from backup? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

# Stop services
echo "Stopping services..."
pm2 stop all

# Delete current database
echo "Deleting current database..."
curl -X DELETE http://$COUCHDB_USER:$COUCHDB_PASSWORD@localhost:5984/$DB_NAME

# Create new database
echo "Creating new database..."
curl -X PUT http://$COUCHDB_USER:$COUCHDB_PASSWORD@localhost:5984/$DB_NAME

# Decompress backup if needed
if [[ $BACKUP_FILE == *.gz ]]; then
    echo "Decompressing backup..."
    gunzip -c $BACKUP_FILE > /tmp/restore-temp.json
    BACKUP_FILE="/tmp/restore-temp.json"
fi

# Restore data
echo "Restoring data..."
# Extract documents from _all_docs response
jq -r '.rows[].doc' $BACKUP_FILE | while read doc; do
    # Skip design documents
    if echo "$doc" | jq -e '.["_id"] | startswith("_design")' > /dev/null; then
        continue
    fi
    
    # Remove _rev field for new insert
    echo "$doc" | jq 'del(._rev)' | \
    curl -X POST http://$COUCHDB_USER:$COUCHDB_PASSWORD@localhost:5984/$DB_NAME \
        -H "Content-Type: application/json" \
        -d @-
done

# Recreate indexes
echo "Recreating indexes..."
cd /opt/scheduleright/apps/server
npm run db:indexes

# Restart services
echo "Restarting services..."
pm2 restart all

# Health check
echo "Running health check..."
sleep 5
curl -f http://localhost:3001/health || echo "⚠️  Health check failed!"

echo "✅ Restore complete!"

# Cleanup
rm -f /tmp/restore-temp.json
```

### Restore Specific Documents

```bash
# Restore specific document type
jq -r '.rows[].doc | select(.type == "booking")' backup.json | \
while read doc; do
    echo "$doc" | jq 'del(._rev)' | \
    curl -X POST http://admin:password@localhost:5984/scheduleright \
        -H "Content-Type: application/json" \
        -d @-
done
```

### Restore from S3

```bash
# Download from S3
aws s3 cp s3://your-backup-bucket/scheduleright/scheduleright-20260116-020000.json.gz \
    /var/backups/scheduleright/

# Then run restore procedure above
```

---

## Disaster Recovery

### Complete System Failure

**Recovery Steps:**

1. **Provision new server** (see [DEPLOYMENT.md](./DEPLOYMENT.md))

2. **Install required software:**
```bash
# Node.js, pnpm, CouchDB, nginx, PM2
# Follow DEPLOYMENT.md setup steps
```

3. **Clone application:**
```bash
cd /opt
git clone <repository-url> scheduleright
cd scheduleright
pnpm install
pnpm build
```

4. **Restore environment files:**
```bash
# Extract from backup
tar -xzf /var/backups/scheduleright/env-<timestamp>.tar.gz -C /opt/scheduleright/apps/server/
```

5. **Restore database:**
```bash
# Run restore script (see above)
./restore.sh /var/backups/scheduleright/scheduleright-<timestamp>.json.gz
```

6. **Start services:**
```bash
pm2 start ecosystem.config.js
pm2 save
```

7. **Verify:**
```bash
curl http://localhost:3001/health
# Test login and basic functionality
```

**Estimated Recovery Time:** 1-2 hours

**Recovery Point Objective (RPO):** 24 hours (daily backups)

**Recovery Time Objective (RTO):** 2 hours

---

### Database Corruption

**Symptoms:**
- CouchDB won't start
- Data inconsistencies
- Errors reading documents

**Recovery:**

1. **Stop services:**
```bash
pm2 stop all
sudo systemctl stop couchdb
```

2. **Backup corrupted database:**
```bash
cp -r /var/lib/couchdb /var/lib/couchdb.corrupt.$(date +%s)
```

3. **Restore from backup:**
```bash
# Follow "Full Database Restore" procedure above
```

4. **If backup is also corrupted:**
```bash
# Try CouchDB compact
curl -X POST http://admin:password@localhost:5984/scheduleright/_compact

# Or rebuild from replication source
```

---

## Backup Verification

### Test Restore Procedure

**Monthly verification recommended:**

```bash
#!/bin/bash
# Test restore in temporary database

TEST_DB="scheduleright_test_restore"
BACKUP_FILE="/var/backups/scheduleright/scheduleright-latest.json.gz"

echo "Testing restore to $TEST_DB..."

# Create test database
curl -X PUT http://admin:password@localhost:5984/$TEST_DB

# Restore to test database
gunzip -c $BACKUP_FILE | jq -r '.rows[].doc' | while read doc; do
    if echo "$doc" | jq -e '.["_id"] | startswith("_design")' > /dev/null; then
        continue
    fi
    echo "$doc" | jq 'del(._rev)' | \
    curl -s -X POST http://admin:password@localhost:5984/$TEST_DB \
        -H "Content-Type: application/json" \
        -d @- > /dev/null
done

# Verify document count
ORIGINAL_COUNT=$(curl -s http://admin:password@localhost:5984/scheduleright | jq '.doc_count')
RESTORED_COUNT=$(curl -s http://admin:password@localhost:5984/$TEST_DB | jq '.doc_count')

echo "Original database: $ORIGINAL_COUNT documents"
echo "Restored database: $RESTORED_COUNT documents"

if [ "$ORIGINAL_COUNT" -eq "$RESTORED_COUNT" ]; then
    echo "✅ Restore test PASSED"
else
    echo "❌ Restore test FAILED (document count mismatch)"
fi

# Cleanup
curl -X DELETE http://admin:password@localhost:5984/$TEST_DB
```

### Backup Checklist

**Before each backup:**
- [ ] Verify CouchDB is running
- [ ] Check disk space (`df -h`)
- [ ] Ensure backup directory exists and is writable

**After each backup:**
- [ ] Verify backup file exists
- [ ] Check backup file size (>0 bytes)
- [ ] Test decompression (`gunzip -t backup.json.gz`)
- [ ] Check backup logs for errors

**Monthly:**
- [ ] Perform test restore to verify backup
- [ ] Review backup retention policy
- [ ] Verify offsite backup copy (if applicable)
- [ ] Document any backup issues

---

## Storage Recommendations

### Local Storage

```bash
# Backup directory structure
/var/backups/scheduleright/
├── daily/
│   ├── scheduleright-20260116-020000.json.gz
│   ├── scheduleright-20260117-020000.json.gz
│   └── ...
├── weekly/
│   ├── scheduleright-week01-2026.json.gz
│   └── ...
└── monthly/
    ├── scheduleright-jan-2026.json.gz
    └── ...
```

### Offsite Storage Options

1. **AWS S3:**
```bash
# Install AWS CLI
sudo apt install awscli

# Configure credentials
aws configure

# Upload backup
aws s3 cp backup.json.gz s3://your-bucket/scheduleright/

# Enable versioning
aws s3api put-bucket-versioning \
    --bucket your-bucket \
    --versioning-configuration Status=Enabled
```

2. **rsync to remote server:**
```bash
# Sync backups to remote server
rsync -avz --delete /var/backups/scheduleright/ \
    user@backup-server:/backups/scheduleright/
```

3. **Cloud backup services:**
- Backblaze B2
- Google Cloud Storage
- Azure Blob Storage

---

## Emergency Contacts

**Database Administrator:** [contact-info]  
**System Administrator:** [contact-info]  
**24/7 Support:** [contact-info]

---

## Backup Monitoring

### Set up backup alerts:

```bash
# Add to backup.sh script

# Send email on failure
if [ $? -ne 0 ]; then
    echo "Backup failed!" | mail -s "ScheduleRight Backup FAILED" admin@example.com
fi

# Send success notification (optional)
echo "Backup completed successfully. Size: $BACKUP_SIZE" | \
    mail -s "ScheduleRight Backup Success" admin@example.com
```

### Monitor backup age:

```bash
# Check last backup age
LAST_BACKUP=$(ls -t /var/backups/scheduleright/*.json.gz | head -1)
BACKUP_AGE=$(( ($(date +%s) - $(stat -c %Y "$LAST_BACKUP")) / 3600 ))

if [ $BACKUP_AGE -gt 25 ]; then
    echo "⚠️  WARNING: Last backup is $BACKUP_AGE hours old!"
fi
```

---

## Summary

- **Daily backups** at 2:00 AM via cron
- **Retention:** 30 days local, indefinite offsite
- **Monthly restore tests** to verify backup integrity
- **Offsite copy** to S3 or remote server
- **Document recovery time:** 1-2 hours

**Remember:** Backups are only useful if you can restore from them. Test regularly!
