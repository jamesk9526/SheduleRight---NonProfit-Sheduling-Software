# Production Deployment - Ubuntu VPS + CloudPanel + nginx

## ✅ Tech Stack Compatibility

**Good news:** This tech stack works **perfectly** on Ubuntu VPS with nginx. No Docker required!

| Component | Dev Setup | Production Setup | Nginx Role |
|-----------|-----------|------------------|-----------|
| Next.js Web App | `pnpm dev` | PM2 / systemd | Reverse proxy to :3000 |
| Fastify API | `pnpm dev` | PM2 / systemd | Reverse proxy to :3001 |
| CouchDB | Docker Compose | Native Ubuntu install | Backend (no proxy needed) |
| Redis | Docker Compose (optional) | Native Ubuntu install | Backend (optional) |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Nginx (Port 80/443)                  │
│             (CloudPanel manages SSL certs)               │
└────────────────┬────────────────────────────────────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
    ▼            ▼            ▼
┌────────┐  ┌────────┐  ┌──────────┐
│ Web    │  │ API    │  │ Admin    │
│ :3000  │  │ :3001  │  │ :3002    │
│(Next)  │  │(Fastify)  │(Next)    │
└────────┘  └────────┘  └──────────┘
    │            │            │
    └────────────┼────────────┘
                 │
         ┌───────┴────────┐
         │                │
         ▼                ▼
    ┌─────────────┐  ┌──────────┐
    │  CouchDB    │  │  Redis   │
    │  :5984      │  │  :6379   │
    │  (Native)   │  │(Optional)│
    └─────────────┘  └──────────┘
```

---

## Prerequisites

```bash
# Ubuntu packages needed
sudo apt update
sudo apt install -y \
  curl \
  wget \
  git \
  build-essential \
  python3 \
  nodejs \
  npm
```

### Node.js Setup

```bash
# Install nvm (Node Version Manager) - RECOMMENDED
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Reload shell
source ~/.bashrc

# Install Node 18+ (LTS)
nvm install 18
nvm use 18
nvm alias default 18

# Verify
node --version  # v18.x.x
npm --version   # 9.x.x
```

### pnpm Installation

```bash
# Install pnpm globally
npm install -g pnpm

# Verify
pnpm --version  # 8.x.x or higher
```

---

## Step 1: Deploy Application Files

### Clone Repository

```bash
# SSH into your VPS
ssh user@your-vps-ip

# Navigate to apps directory (CloudPanel typically uses /home/user/apps/)
cd /home/user/apps

# Clone the repository
git clone https://github.com/yourusername/SheduleRight-NonProfit-Scheduling-Software.git scheduleright

# Navigate to project
cd scheduleright

# Verify directory structure
ls -la
# Should show: apps/, pnpm-workspace.yaml, package.json, etc.
```

### Install Dependencies

```bash
# Install all workspace dependencies
pnpm install

# This installs:
# - apps/web (Next.js)
# - apps/server (Fastify API)
# - apps/admin (Next.js)
# - apps/embed (Next.js)
# - All shared packages
```

---

## Step 2: Set Up Databases

### CouchDB Installation (Native)

```bash
# Add CouchDB repository
curl https://couchdb.apache.org/repo/keys.asc | gpg --dearmor | sudo tee /usr/share/keyrings/couchdb-archive-keyring.gpg > /dev/null
echo "deb [signed-by=/usr/share/keyrings/couchdb-archive-keyring.gpg] https://apache.jfrog.io/artifactory/couchdb-deb/ $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/couchdb.list

# Install CouchDB
sudo apt update
sudo apt install -y couchdb

# Enable and start service
sudo systemctl enable couchdb
sudo systemctl start couchdb

# Verify running
curl http://localhost:5984/
# Should return: {"couchdb":"Welcome",...}
```

### CouchDB Initial Setup

```bash
# Set admin username/password
curl -X PUT http://localhost:5984/_node/nonode@nohost/_config/admins/admin -d '"your-strong-password"'

# Create databases
curl -X PUT http://localhost:5984/scheduleright \
  -u admin:your-strong-password

# Verify
curl http://localhost:5984/_all_dbs \
  -u admin:your-strong-password
# Should include: ["scheduleright"]
```

### Redis (Optional - for Job Queue)

```bash
# Install Redis
sudo apt install -y redis-server

# Enable and start
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Verify
redis-cli ping
# Should return: PONG
```

---

## Step 3: Configure Environment Variables

### Create `.env` file

```bash
cd /home/user/apps/scheduleright

# Create environment file
cat > .env << 'EOF'
# Application Environment
NODE_ENV=production
ENVIRONMENT=production

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this

# Database Configuration
COUCHDB_URL=http://localhost:5984
COUCHDB_USER=admin
COUCHDB_PASSWORD=your-strong-password
COUCHDB_DB=scheduleright

# Redis Configuration (optional)
REDIS_URL=redis://localhost:6379

# API Server Configuration
API_PORT=3001
API_HOST=0.0.0.0

# Web Application Configuration
NEXT_PUBLIC_API_URL=https://yourdomain.com/api  # Note: HTTPS for production

# CORS Configuration
CORS_ORIGIN=https://yourdomain.com

# Admin App
ADMIN_PORT=3002
EOF
```

### Update Secrets

```bash
# Use strong random values
JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH=$(openssl rand -base64 32)
COUCHDB_PASS=$(openssl rand -base64 16)

echo "JWT_SECRET=$JWT_SECRET"
echo "JWT_REFRESH=$JWT_REFRESH"
echo "COUCHDB_PASS=$COUCHDB_PASS"

# Update the .env file with these values
```

### Secure .env File

```bash
# Restrict permissions
chmod 600 .env

# Only app user should read it
ls -la .env
# -rw------- 1 user user 500 Jan 16 12:00 .env
```

---

## Step 4: Build Applications

### Production Build

```bash
# Build all apps
pnpm build

# This compiles:
# - Next.js apps → optimized bundles in .next/
# - API server → TypeScript → JavaScript
# - All assets

# Verify builds
ls -la apps/web/.next/
ls -la apps/server/dist/
ls -la apps/admin/.next/
```

### Database Seeding (One-time)

```bash
# Seed initial data
pnpm --filter=@scheduleright/server seed

# This creates:
# - Admin organization
# - Test users (admin, staff, volunteer, client)
# - Sample site
```

---

## Step 5: Process Management with PM2

### Install PM2 Globally

```bash
npm install -g pm2

# Enable startup hook
pm2 startup

# Save PM2 config
pm2 save
```

### Create PM2 Ecosystem File

```bash
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'scheduleright-web',
      script: 'pnpm',
      args: '--filter=@scheduleright/web start',
      cwd: '/home/user/apps/scheduleright',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/web-error.log',
      out_file: './logs/web-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_memory_restart: '500M',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '60s'
    },
    {
      name: 'scheduleright-api',
      script: 'pnpm',
      args: '--filter=@scheduleright/server start',
      cwd: '/home/user/apps/scheduleright',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_memory_restart: '300M',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '60s'
    },
    {
      name: 'scheduleright-admin',
      script: 'pnpm',
      args: '--filter=@scheduleright/admin start',
      cwd: '/home/user/apps/scheduleright',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3002
      },
      error_file: './logs/admin-error.log',
      out_file: './logs/admin-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_memory_restart: '500M',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '60s'
    }
  ]
};
EOF
```

### Start Applications with PM2

```bash
# Create logs directory
mkdir -p logs

# Start all apps
pm2 start ecosystem.config.js

# Check status
pm2 status

# View logs
pm2 logs scheduleright-web
pm2 logs scheduleright-api
pm2 logs scheduleright-admin

# Save PM2 config for auto-restart on reboot
pm2 save
pm2 startup
```

### Useful PM2 Commands

```bash
# Restart all
pm2 restart all

# Restart specific app
pm2 restart scheduleright-api

# Stop all
pm2 stop all

# Delete from PM2
pm2 delete ecosystem.config.js

# Monitor real-time
pm2 monit

# View specific logs
pm2 logs scheduleright-api --lines 100
```

---

## Step 6: Configure nginx Reverse Proxy

### Create nginx Configuration

```bash
# Create config for your domain
sudo nano /etc/nginx/sites-available/scheduleright.conf
```

### nginx Configuration File

```nginx
# Upstream definitions
upstream scheduleright_web {
    server 127.0.0.1:3000;
    keepalive 64;
}

upstream scheduleright_api {
    server 127.0.0.1:3001;
    keepalive 64;
}

upstream scheduleright_admin {
    server 127.0.0.1:3002;
    keepalive 64;
}

# Main server block (yourdomain.com)
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Certificates (CloudPanel manages these)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;

    # Root location → Next.js Web App
    location / {
        proxy_pass http://scheduleright_web;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # API routes → Fastify API Server
    location /api/ {
        proxy_pass http://scheduleright_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Allow large request bodies for uploads
        client_max_body_size 50M;
    }

    # Health check endpoints
    location /health {
        proxy_pass http://scheduleright_api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    location /status {
        proxy_pass http://scheduleright_api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}

# Admin subdomain (admin.yourdomain.com)
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name admin.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    location / {
        proxy_pass http://scheduleright_admin;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Enable nginx Configuration

```bash
# Create symlink to enable site
sudo ln -s /etc/nginx/sites-available/scheduleright.conf /etc/nginx/sites-enabled/

# Test nginx syntax
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx

# Verify running
sudo systemctl status nginx
```

---

## Step 7: Update API Configuration for Production

### Update `.env` with Production URLs

```bash
# Edit .env file
nano .env

# Update these values:
NEXT_PUBLIC_API_URL=https://yourdomain.com/api
CORS_ORIGIN=https://yourdomain.com
API_HOST=0.0.0.0  # Listen on all interfaces
```

### Rebuild Applications with New Config

```bash
# Rebuild with new environment
pnpm build

# Restart services
pm2 restart all

# Verify logs
pm2 logs scheduleright-api | head -20
```

---

## Step 8: Verify Production Deployment

### Check Services Running

```bash
# Check PM2 status
pm2 status

# Check processes listening on ports
lsof -i :3000  # Web app
lsof -i :3001  # API
lsof -i :3002  # Admin

# Check nginx
sudo systemctl status nginx

# Check CouchDB
curl http://localhost:5984/

# Check Redis (if used)
redis-cli ping
```

### Test from Browser

```
https://yourdomain.com              # Main web app
https://yourdomain.com/health       # API health check
https://yourdomain.com/status       # API status dashboard
https://admin.yourdomain.com        # Admin app
```

### Test API Connectivity

```bash
# From your VPS
curl -X GET https://yourdomain.com/health

# Should return JSON:
# {
#   "status": "ok",
#   "timestamp": "2026-01-16T12:00:00.000Z",
#   "uptime": 3600,
#   "services": {
#     "database": "connected"
#   }
# }
```

---

## Step 9: Backup Strategy

### Create Backup Script

```bash
cat > /home/user/apps/scheduleright/backup.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/home/user/backups/scheduleright"
DATE=$(date +%Y-%m-%d_%H-%M-%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup CouchDB
curl -X GET http://localhost:5984/scheduleright \
  -u admin:$COUCHDB_PASSWORD | gzip > $BACKUP_DIR/couchdb_$DATE.json.gz

# Backup environment and config
cp /home/user/apps/scheduleright/.env $BACKUP_DIR/.env_$DATE

# Backup nginx config
sudo cp /etc/nginx/sites-available/scheduleright.conf $BACKUP_DIR/nginx_$DATE.conf

# Remove backups older than 30 days
find $BACKUP_DIR -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR"
EOF

chmod +x /home/user/apps/scheduleright/backup.sh
```

### Schedule Automated Backups

```bash
# Add to crontab (daily at 2 AM)
crontab -e

# Add line:
0 2 * * * /home/user/apps/scheduleright/backup.sh
```

---

## Step 10: Monitoring & Logs

### CloudPanel Integration

If CloudPanel has Node.js app management:

1. **Point CloudPanel** to `/home/user/apps/scheduleright`
2. **Enable** automatic SSL certificate management
3. **Monitor** PM2 processes via CloudPanel dashboard

### View Application Logs

```bash
# All logs
pm2 logs

# Specific app logs (last 100 lines)
pm2 logs scheduleright-api --lines 100

# Real-time monitoring
pm2 monit

# Filter logs by app
pm2 logs scheduleright-web

# Save logs to file
pm2 logs scheduleright-api > /tmp/api.log
```

### Check System Health

```bash
# CPU and Memory usage
top -b -n 1 | grep -E "PID|scheduleright"

# Disk space
df -h

# Open ports
sudo netstat -tulpn | grep LISTEN
```

### nginx Error Logs

```bash
# nginx access log
sudo tail -f /var/log/nginx/access.log

# nginx error log
sudo tail -f /var/log/nginx/error.log

# Filter by domain
sudo tail -f /var/log/nginx/access.log | grep yourdomain.com
```

---

## Troubleshooting

### Application won't start

```bash
# Check PM2 logs
pm2 logs scheduleright-api

# Verify environment variables
cat .env

# Verify CouchDB is running
curl http://localhost:5984/

# Restart PM2
pm2 restart all
```

### nginx returning 502 Bad Gateway

```bash
# Check upstream services
lsof -i :3000
lsof -i :3001

# Check nginx logs
sudo tail -f /var/log/nginx/error.log

# Test nginx config
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

### CORS errors in browser

```bash
# Verify CORS_ORIGIN in .env
grep CORS_ORIGIN .env

# Should match your domain:
# CORS_ORIGIN=https://yourdomain.com

# Rebuild and restart
pnpm build
pm2 restart scheduleright-api
```

### CouchDB connection errors

```bash
# Verify CouchDB credentials
curl http://localhost:5984/ -u admin:your-password

# Check CouchDB logs
sudo journalctl -u couchdb -f

# Restart CouchDB
sudo systemctl restart couchdb
```

---

## Security Hardening

### Firewall Setup

```bash
# UFW (Uncomplicated Firewall)
sudo apt install ufw

# Enable
sudo ufw enable

# Allow SSH
sudo ufw allow 22

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Deny CouchDB from outside (internal only)
sudo ufw deny from any to any port 5984

# Deny Redis from outside (internal only)
sudo ufw deny from any to any port 6379

# Check status
sudo ufw status
```

### Fail2Ban (Brute Force Protection)

```bash
# Install
sudo apt install fail2ban

# Enable
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Monitor
sudo fail2ban-client status
```

### Regular Updates

```bash
# Keep system updated
sudo apt update
sudo apt upgrade -y

# Keep Node.js updated
nvm install node  # Latest LTS
nvm alias default node

# Update npm/pnpm
npm install -g npm pnpm
```

---

## Summary: Tech Stack Compatibility

✅ **Fully Compatible with Ubuntu VPS + nginx:**

- **Node.js** - Runs natively on Ubuntu
- **Next.js** - Serves via PM2 + nginx reverse proxy
- **Fastify API** - Serves via PM2 + nginx reverse proxy  
- **CouchDB** - Installs natively on Ubuntu
- **nginx** - Perfect reverse proxy for all apps
- **CloudPanel** - Can manage SSL, monitor processes

❌ **No Docker needed** for production - it's only for local development convenience!

**This setup scales and is battle-tested in production environments.**
