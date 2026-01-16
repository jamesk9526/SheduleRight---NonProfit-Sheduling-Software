# ScheduleRight Production Deployment Guide

**Last Updated:** January 16, 2026  
**Version:** 1.0

---

## Prerequisites

### Server Requirements

**Minimum:**
- 2 GB RAM
- 2 CPU cores
- 20 GB disk space
- Ubuntu 22.04 LTS (or similar Linux distribution)

**Recommended:**
- 4 GB RAM
- 4 CPU cores
- 50 GB SSD storage
- Ubuntu 22.04 LTS

### Required Software

- Node.js 20.x LTS
- pnpm 8.x
- CouchDB 3.3.x
- nginx (reverse proxy)
- PM2 (process manager) or systemd

---

## Step-by-Step Deployment

### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install pnpm
npm install -g pnpm

# Install PM2 (process manager)
npm install -g pm2

# Install nginx
sudo apt install -y nginx

# Install CouchDB (3.3.x)
# Add CouchDB repository
curl -L https://couchdb.apache.org/repo/keys.asc | sudo gpg --dearmor -o /usr/share/keyrings/couchdb-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/couchdb-archive-keyring.gpg] https://apache.jfrog.io/artifactory/couchdb-deb/ focal main" | sudo tee /etc/apt/sources.list.d/couchdb.list

sudo apt update
sudo apt install -y couchdb

# Configure CouchDB (select standalone mode, set admin password)
```

### 2. Clone and Setup Application

```bash
# Create application directory
sudo mkdir -p /opt/scheduleright
sudo chown $USER:$USER /opt/scheduleright

# Clone repository
cd /opt/scheduleright
git clone https://github.com/jamesk9526/SheduleRight---NonProfit-Sheduling-Software.git .

# Install dependencies
pnpm install

# Build applications
pnpm build
```

### 3. Environment Configuration

```bash
# Create production environment files
cd /opt/scheduleright/apps/server

# Copy example and edit
cp .env.example .env

# Edit with production values
nano .env
```

**Required Environment Variables:**

```env
NODE_ENV=production
SERVER_PORT=3001
SERVER_URL=https://your-domain.com
API_VERSION=v1

# Database
COUCHDB_URL=http://localhost:5984
COUCHDB_USER=admin
COUCHDB_PASSWORD=<your-secure-password>

# Redis
REDIS_URL=redis://localhost:6379

# Authentication - GENERATE STRONG SECRET!
# Generate with: openssl rand -base64 32
JWT_SECRET=<your-64-character-secret>
JWT_EXPIRY=900
REFRESH_TOKEN_EXPIRY=604800

# CORS - Your production domain(s)
CORS_ORIGIN=https://your-domain.com,https://www.your-domain.com

# Logging
LOG_LEVEL=info
OTEL_ENABLED=false
```

### 4. Database Initialization

```bash
# Create CouchDB database
curl -X PUT http://admin:password@localhost:5984/scheduleright

# Create indexes
cd /opt/scheduleright/apps/server
npm run db:indexes

# Seed initial data (optional, for testing)
npm run seed
```

### 5. PM2 Process Management

```bash
# Create PM2 ecosystem file
cat > /opt/scheduleright/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'scheduleright-server',
      script: 'apps/server/dist/index.js',
      cwd: '/opt/scheduleright',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
      },
      error_file: '/var/log/scheduleright/server-error.log',
      out_file: '/var/log/scheduleright/server-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      max_memory_restart: '1G',
    },
    {
      name: 'scheduleright-web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      cwd: '/opt/scheduleright/apps/web',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      error_file: '/var/log/scheduleright/web-error.log',
      out_file: '/var/log/scheduleright/web-out.log',
    },
  ],
}
EOF

# Create log directory
sudo mkdir -p /var/log/scheduleright
sudo chown $USER:$USER /var/log/scheduleright

# Start applications with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup systemd
# Run the command that PM2 outputs
```

### 6. nginx Configuration

```bash
# Create nginx configuration
sudo nano /etc/nginx/sites-available/scheduleright
```

```nginx
# Server block for HTTP (redirect to HTTPS)
server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com www.your-domain.com;

    # Redirect to HTTPS
    return 301 https://$host$request_uri;
}

# Server block for HTTPS
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL Certificate (configure with Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # API routes
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health checks (no SSL redirect)
    location ~ ^/(health|readiness|metrics|status)$ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        access_log off;
    }

    # Web application
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Static files cache
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://localhost:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/scheduleright /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

### 7. SSL Certificate with Let's Encrypt

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Test auto-renewal
sudo certbot renew --dry-run

# Certbot will automatically renew certificates
```

### 8. Firewall Configuration

```bash
# Enable UFW
sudo ufw enable

# Allow SSH (IMPORTANT!)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Check status
sudo ufw status
```

---

## Deployment Script

Create an automated deployment script:

```bash
#!/bin/bash
# deploy.sh - Automated deployment script

set -e  # Exit on error

echo "🚀 Starting ScheduleRight deployment..."

# Pull latest code
echo "📥 Pulling latest code..."
cd /opt/scheduleright
git pull origin main

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Build applications
echo "🔨 Building applications..."
pnpm build

# Create indexes (if needed)
echo "🔍 Creating database indexes..."
cd apps/server
npm run db:indexes || true

# Restart services
echo "🔄 Restarting services..."
pm2 reload ecosystem.config.js --update-env

# Health check
echo "🏥 Checking health..."
sleep 5
curl -f http://localhost:3001/health || {
    echo "❌ Health check failed!"
    pm2 logs --err --lines 50
    exit 1
}

echo "✅ Deployment complete!"
echo "📊 Service status:"
pm2 status
```

Make it executable:

```bash
chmod +x /opt/scheduleright/deploy.sh
```

---

## Post-Deployment Verification

### 1. Check Services

```bash
# PM2 status
pm2 status

# View logs
pm2 logs

# Check individual service
pm2 logs scheduleright-server
```

### 2. Health Checks

```bash
# Basic health
curl https://your-domain.com/health

# Detailed readiness
curl https://your-domain.com/readiness

# Metrics
curl https://your-domain.com/metrics
```

### 3. Test API

```bash
# Test authentication
curl -X POST https://your-domain.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'
```

### 4. Monitor Logs

```bash
# Real-time logs
pm2 logs --lines 100

# Error logs only
pm2 logs --err

# Filter by service
pm2 logs scheduleright-server --lines 50
```

---

## Maintenance

### Update Deployment

```bash
# Run deployment script
/opt/scheduleright/deploy.sh
```

### Restart Services

```bash
# Reload all services (zero-downtime)
pm2 reload all

# Restart specific service
pm2 restart scheduleright-server

# Restart nginx
sudo systemctl restart nginx
```

### View Metrics

```bash
# PM2 monitoring
pm2 monit

# System resources
htop

# Disk usage
df -h
```

---

## Backup & Restore

See [BACKUP.md](./BACKUP.md) for detailed backup and restore procedures.

---

## Troubleshooting

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues and solutions.

---

## Security Checklist

- [ ] Strong JWT_SECRET generated (min 64 chars)
- [ ] Strong CouchDB admin password set
- [ ] HTTPS enabled with valid SSL certificate
- [ ] Firewall configured (UFW)
- [ ] SSH key authentication enabled
- [ ] Root login disabled
- [ ] Fail2ban installed (optional)
- [ ] Regular security updates enabled
- [ ] Environment variables secured
- [ ] Database backups automated
- [ ] Log rotation configured
- [ ] Monitoring/alerting setup

---

## Support

For issues or questions:
- GitHub Issues: https://github.com/jamesk9526/SheduleRight---NonProfit-Sheduling-Software/issues
- Documentation: https://github.com/jamesk9526/SheduleRight---NonProfit-Sheduling-Software
