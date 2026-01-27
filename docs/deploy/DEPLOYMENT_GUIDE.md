# CCIT Wall Backend - Security Deployment Guide

## Overview

This guide is for DevOps/SRE teams deploying the CCIT Wall backend with security hardening to production.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Internet / Users                            │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼ HTTPS (TLS 1.2+)
┌─────────────────────────────────────────────────────────────────┐
│                    NGINX Reverse Proxy                           │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ • Rate limiting (global, auth, admin)                      ││
│  │ • IP allowlisting (/api/admin only)                        ││
│  │ • HTTP method blocking (TRACE, CONNECT)                    ││
│  │ • Security headers (backup to Helmet)                      ││
│  │ • HSTS, redirect HTTP → HTTPS                              ││
│  └─────────────────────────────────────────────────────────────┘│
│                      proxy_pass → backend                        │
│                    X-Forwarded-* headers                         │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼ HTTP (local, TLS terminated)
┌─────────────────────────────────────────────────────────────────┐
│                   Node.js/Express Backend                        │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ • Helmet (additional security headers)                      ││
│  │ • Rate limiting (global, configurable)                      ││
│  │ • HTTP method restriction (middleware)                      ││
│  │ • IP allowlist (CIDR validation, trust proxy)              ││
│  │ • Trust proxy (reads X-Forwarded-For)                      ││
│  │ • Auth middleware (JWT validation)                          ││
│  │ • Business logic (posts, comments, users, admin)           ││
│  └─────────────────────────────────────────────────────────────┘│
│                       ↓ MongoDB queries
│                   MongoDB Database
└─────────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

- Ubuntu 20.04 LTS or later (or equivalent)
- NGINX 1.18+
- Node.js 16+
- MongoDB (managed service or self-hosted)
- Let's Encrypt (or other SSL cert provider)
- DNS pointing to your server

---

## Installation Steps

### 1. System Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install NGINX
sudo apt install -y nginx certbot python3-certbot-nginx

# Install MongoDB (if self-hosted)
# sudo apt install -y mongodb-org

# Create service user
sudo useradd -r -s /bin/bash -d /opt/ccit-wall ccit-wall
```

### 2. Application Setup

```bash
# Create app directory
sudo mkdir -p /opt/ccit-wall
sudo chown ccit-wall:ccit-wall /opt/ccit-wall

# Clone/pull repository
cd /opt/ccit-wall
# git clone <your-repo> .

# Install dependencies
cd backend
npm install

# Build TypeScript
npm run build
```

### 3. Environment Configuration

```bash
# Create .env file
sudo nano /opt/ccit-wall/backend/.env
```

Add these values:
```env
# Core
PORT=4000
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/ccit-wall
JWT_SECRET=<generate-with-'openssl rand -base64 32'>
CLIENT_URL=https://your-domain.com

# Security
ENABLE_TRUST_PROXY=true
ENABLE_CORS=false
ENABLE_ETAG=false
ENABLE_CSP=false

# Rate Limiting
RATE_LIMIT_MAX=200
RATE_LIMIT_WINDOW_MS=900000

# Admin IP Allowlist (example: office network + VPN)
ADMIN_ALLOWLIST_CIDR=10.0.0.0/8,203.0.113.0/24

# Debug
DEBUG=false
```

**Secure the .env file:**
```bash
sudo chown ccit-wall:ccit-wall /opt/ccit-wall/backend/.env
sudo chmod 600 /opt/ccit-wall/backend/.env
```

### 4. SSL Certificate

```bash
# Generate Let's Encrypt certificate
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com

# Certificate location:
# /etc/letsencrypt/live/your-domain.com/fullchain.pem
# /etc/letsencrypt/live/your-domain.com/privkey.pem
```

### 5. NGINX Configuration

```bash
# Copy configuration
sudo cp /opt/ccit-wall/deploy/nginx.conf.example /etc/nginx/sites-available/ccit-wall

# Edit and customize
sudo nano /etc/nginx/sites-available/ccit-wall
```

**Required changes:**
- Replace `your-domain.com` with your domain
- Update SSL certificate paths
- Customize admin IP allowlist
- Update upstream backend address if needed

**Enable site:**
```bash
sudo ln -s /etc/nginx/sites-available/ccit-wall /etc/nginx/sites-enabled/

# Disable default site (optional)
sudo rm /etc/nginx/sites-enabled/default
```

**Test NGINX:**
```bash
sudo nginx -t
# Should output: "syntax is ok, test is successful"
```

### 6. Systemd Service

Create `/etc/systemd/system/ccit-wall-backend.service`:

```ini
[Unit]
Description=CCIT Wall Backend
After=network.target mongodb.service
Wants=network-online.target

[Service]
Type=simple
User=ccit-wall
WorkingDirectory=/opt/ccit-wall/backend
EnvironmentFile=/opt/ccit-wall/backend/.env

# Start command
ExecStart=/usr/bin/node /opt/ccit-wall/backend/dist/index.js

# Restart policy
Restart=always
RestartSec=10

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=ccit-wall

# Resource limits
LimitNOFILE=65535
LimitNPROC=4096

[Install]
WantedBy=multi-user.target
```

**Enable and start service:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable ccit-wall-backend
sudo systemctl start ccit-wall-backend

# Check status
sudo systemctl status ccit-wall-backend

# View logs
sudo journalctl -u ccit-wall-backend -f
```

### 7. NGINX Start

```bash
sudo systemctl enable nginx
sudo systemctl start nginx

# Check status
sudo systemctl status nginx
```

---

## Monitoring & Logging

### Application Logs

```bash
# Real-time logs
sudo journalctl -u ccit-wall-backend -f

# Last 100 lines
sudo journalctl -u ccit-wall-backend -n 100

# Errors only
sudo journalctl -u ccit-wall-backend -p err
```

### NGINX Logs

```bash
# Access log
sudo tail -f /var/log/nginx/ccit-wall-access.log

# Error log
sudo tail -f /var/log/nginx/ccit-wall-error.log

# Rate limit rejections (429)
sudo grep "429" /var/log/nginx/ccit-wall-access.log
```

### Monitor Key Metrics

```bash
# Rate limited IPs
sudo grep "429" /var/log/nginx/ccit-wall-access.log | awk '{print $1}' | sort | uniq -c | sort -rn

# Most common endpoints
sudo awk '{print $7}' /var/log/nginx/ccit-wall-access.log | sort | uniq -c | sort -rn

# Response times (if logging configured)
sudo grep "response_time" /var/log/nginx/ccit-wall-access.log
```

---

## Security Verification

### 1. HTTPS/TLS

```bash
# Verify HTTPS works and redirects HTTP
curl -I http://your-domain.com
# Should redirect to https

curl -I https://your-domain.com
# Should return 200 OK
```

### 2. Security Headers

```bash
# Check Helmet headers
curl -I https://your-domain.com/health | grep -E "X-Frame|X-Content|Referrer|Strict-Transport"

# Expected output includes:
# X-Frame-Options: SAMEORIGIN
# X-Content-Type-Options: nosniff
# Referrer-Policy: no-referrer
# Strict-Transport-Security: max-age=31536000
```

### 3. HSTS Preload

```bash
# Submit your domain to HSTS preload list
# https://hstspreload.org/

# Verify configuration includes:
# add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
```

### 4. Rate Limiting

```bash
# Test rate limiting (should be blocked after 200 requests in 15 min)
for i in {1..210}; do curl https://your-domain.com/health; done

# Check for 429 responses
```

### 5. Method Restriction

```bash
# These should return 405
curl -X DELETE https://your-domain.com/health
curl -X TRACE https://your-domain.com/health
curl -X CONNECT https://your-domain.com/health

# This should return 200
curl -X GET https://your-domain.com/health
```

### 6. Admin IP Allowlist

```bash
# From allowed IP (office network, VPN)
curl -H "Authorization: Bearer <token>" https://your-domain.com/api/admin/dashboard
# Expected: 200 OK (if auth valid)

# From denied IP
curl -H "Authorization: Bearer <token>" https://your-domain.com/api/admin/dashboard
# Expected: 403 Forbidden
```

---

## Backup & Recovery

### Database Backups

```bash
# If using MongoDB Atlas (managed)
# Enable automated backups in Atlas console

# If self-hosted MongoDB
mongodb_backup.sh:
#!/bin/bash
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR=/backups/mongodb
mkdir -p $BACKUP_DIR
mongodump --out $BACKUP_DIR/ccit-wall_$DATE
# Compress
tar -czf $BACKUP_DIR/ccit-wall_$DATE.tar.gz $BACKUP_DIR/ccit-wall_$DATE
# Upload to S3, GCS, or other storage
```

### Application Backup

```bash
# Backup .env and secrets (encrypted)
sudo tar --encrypt --gzip \
  -f /backups/ccit-wall-config-$(date +%Y%m%d).tar.gz.gpg \
  /opt/ccit-wall/backend/.env

# Store GPG key securely (password manager, HSM, etc.)
```

---

## Updates & Maintenance

### Update Node.js

```bash
# Check for security updates
sudo apt update && sudo apt list --upgradable

# Update Node.js
sudo apt upgrade nodejs

# Restart backend
sudo systemctl restart ccit-wall-backend
```

### Update Application Code

```bash
cd /opt/ccit-wall
git pull origin main  # or your branch

cd backend
npm install  # Install new dependencies
npm run build  # Rebuild

# Restart backend (systemd handles graceful shutdown)
sudo systemctl restart ccit-wall-backend
```

### Update SSL Certificate

```bash
# Let's Encrypt auto-renews before expiry, but you can force renewal:
sudo certbot renew --force-renewal

# Reload NGINX to pick up new cert
sudo systemctl reload nginx
```

### Update NGINX

```bash
# NGINX usually auto-reloads config on update
sudo apt upgrade nginx

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

---

## Troubleshooting

### Backend Not Starting

```bash
# Check service status
sudo systemctl status ccit-wall-backend

# View error logs
sudo journalctl -u ccit-wall-backend -p err

# Manual test
cd /opt/ccit-wall/backend
npm run build
node dist/index.js

# Check .env file permissions
ls -la /opt/ccit-wall/backend/.env
```

### NGINX Not Proxying Correctly

```bash
# Test NGINX config
sudo nginx -t

# View NGINX error log
sudo tail -f /var/log/nginx/ccit-wall-error.log

# Check NGINX is running
sudo systemctl status nginx

# Test backend is responding
curl http://localhost:4000/health
```

### Rate Limiting Too Aggressive

```bash
# Adjust in .env
RATE_LIMIT_MAX=500  # Increase
RATE_LIMIT_WINDOW_MS=60000  # Reduce window to 1min

# Or adjust in NGINX rate_req_zone if needed
```

### Admin Allowlist Blocking Valid IPs

```bash
# Verify IP is in allowlist
# e.g., if your office IP is 203.0.113.50:
ADMIN_ALLOWLIST_CIDR=10.0.0.0/8,192.168.1.0/24,203.0.113.50/32

# Check what IP is being seen
curl -I https://your-domain.com/health
# Look for X-Real-IP header if configured
```

### SSL Certificate Issues

```bash
# Check certificate validity
sudo openssl x509 -in /etc/letsencrypt/live/your-domain.com/fullchain.pem -text -noout

# Check expiration date
sudo openssl x509 -in /etc/letsencrypt/live/your-domain.com/fullchain.pem -noout -dates

# Renew manually if needed
sudo certbot renew --force-renewal -d your-domain.com
```

---

## Performance Tuning

### NGINX

```nginx
# /etc/nginx/nginx.conf

# Increase worker connections for high traffic
worker_connections 4096;

# Enable gzip compression
gzip on;
gzip_min_length 1000;
gzip_types text/plain application/json;

# Enable caching
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=general:10m;
```

### Node.js

```bash
# In systemd service or manually
# Increase file descriptor limit
ulimit -n 65535

# Use cluster mode (optional, if needed)
# Requires code changes; see Node.js docs
```

### Database

```bash
# MongoDB index optimization
db.users.createIndex({ email: 1 })
db.posts.createIndex({ userId: 1 })
db.comments.createIndex({ postId: 1 })
```

---

## Security Hardening Checklist

### Initial Setup
- [x] System fully updated
- [x] Firewall configured (only 80, 443 open)
- [x] Service user (non-root) created
- [x] .env file secured (600 permissions)
- [x] SSL certificate installed
- [x] NGINX configured
- [x] Backend service running

### Production Configuration
- [x] `NODE_ENV=production`
- [x] `JWT_SECRET` is strong (32+ random chars)
- [x] `ADMIN_ALLOWLIST_CIDR` configured for your network
- [x] `ENABLE_TRUST_PROXY=true`
- [x] `CLIENT_URL` matches frontend domain
- [x] Rate limits tuned for your traffic
- [x] Database authentication configured
- [x] Logs are being collected/monitored

### Security Verification
- [x] HTTPS works (curl -I https://domain.com)
- [x] Security headers present (X-Frame-Options, etc.)
- [x] Method restriction works (DELETE returns 405)
- [x] Rate limiting works (210 requests → 429s)
- [x] Admin allowlist works (403 from denied IPs)
- [x] No stack traces in production responses
- [x] Monitoring and alerting configured

### Ongoing
- [x] Logs monitored for errors/attacks
- [x] SSL certificate auto-renewal working
- [x] Security updates applied promptly
- [x] Regular backups taken
- [x] Disaster recovery plan tested

---

## Disaster Recovery

### Restore from Backup

```bash
# Stop backend
sudo systemctl stop ccit-wall-backend

# Restore .env (decrypt, extract)
sudo gpg --decrypt /backups/ccit-wall-config-*.tar.gz.gpg | \
  tar xz -C /opt/ccit-wall/backend

# Restore database (if needed)
mongorestore --archive=/backups/ccit-wall_*.tar.gz

# Rebuild and restart
cd /opt/ccit-wall/backend
npm run build
sudo systemctl start ccit-wall-backend
```

---

## Support

For issues or questions:

1. Check logs: `sudo journalctl -u ccit-wall-backend -f`
2. Review documentation: [SECURITY.md](../SECURITY.md)
3. Check NGINX config: `sudo nginx -t`
4. Test endpoints: `curl -I https://your-domain.com/health`

---

**Deployment Complete! 🎉**

Your CCIT Wall backend is now secure and production-ready.
