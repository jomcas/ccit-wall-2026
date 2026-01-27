# CCIT Wall Security Hardening Guide

## Overview

This document outlines the security enhancements implemented in the CCIT Wall backend application. All changes maintain backward compatibility and are designed to be incrementally enabled via environment variables.

## Security Enhancements

### 1. Stack Fingerprinting Mitigation

**What:** Hide information about the server technology and version.

**Changes:**
- Disabled `X-Powered-By` header (does not expose Express)
- Disabled ETag header by default for consistency
- Removed unnecessary server version information

**Configuration:**
```env
# Enable ETags for caching optimization (optional, default: false)
ENABLE_ETAG=false
```

**Verification:**
```bash
curl -I http://localhost:4000/health
# Look for: NO X-Powered-By header, NO ETag header
```

---

### 2. Security Headers via Helmet

**What:** Comprehensive HTTP header hardening against common web attacks.

**Headers Added:**
| Header | Value | Purpose |
|--------|-------|---------|
| `X-Frame-Options` | SAMEORIGIN | Prevents clickjacking attacks |
| `X-Content-Type-Options` | nosniff | Prevents MIME-type sniffing |
| `Referrer-Policy` | no-referrer | Privacy: don't send referrer info |
| `Cross-Origin-Opener-Policy` | same-origin | Prevents window.opener access from other origins |
| `Strict-Transport-Security` | max-age=31536000 | Forces HTTPS for 1 year (set by Helmet) |

**Optional: Content Security Policy (CSP)**

CSP is disabled by default to avoid breaking existing frontend assets. Enable it carefully:

```env
ENABLE_CSP=true
```

CSP Configuration (in `src/index.ts`):
```javascript
directives: {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", "'unsafe-inline'"], // Adjust per your frontend
  styleSrc: ["'self'", "'unsafe-inline'"],
  imgSrc: ["'self'", "data:", "https:"],
  connectSrc: ["'self'"],
  objectSrc: ["'none'"],
  upgradeInsecureRequests: []
}
```

**Verification:**
```bash
curl -I http://localhost:4000/health | grep -E "X-Frame|X-Content|Referrer"
```

---

### 3. HTTP Method Restriction

**What:** Only allow safe/common HTTP methods. Block dangerous ones (PUT, DELETE, TRACE, CONNECT).

**Allowed Methods:**
- `GET` ✅ Always allowed
- `POST` ✅ Always allowed
- `HEAD` ✅ Always allowed
- `OPTIONS` ✅ Allowed if `ENABLE_CORS=true`
- `PUT`, `DELETE`, `PATCH`, `TRACE`, `CONNECT` ❌ Blocked with 405 response

**Why:**
- DELETE is restricted at HTTP level and handled by authentication/authorization
- TRACE, CONNECT are rarely needed and pose security risks
- This provides defense-in-depth

**Verification:**
```bash
# Should succeed
curl -X GET http://localhost:4000/health

# Should fail with 405
curl -X DELETE http://localhost:4000/health
```

---

### 4. Directory Browsing Prevention

**What:** Ensure static file serving doesn't expose directory listings.

**Implementation:**
- No `serve-index` middleware active
- Reverse proxy (NGINX) configured with `autoindex off;` (see `deploy/nginx.conf.example`)

**Verification:**
```bash
# Should NOT return directory listing
curl http://localhost:4000/
```

---

### 5. Admin Route IP Allowlist

**What:** Restrict admin routes to specific IP ranges for additional security.

**Protected Routes:**
- `GET /api/admin/dashboard`
- `GET /api/admin/users/:userId/activity`
- `GET /api/admin/search/users`
- `GET /api/admin/search/posts`

**Configuration:**
```env
# Comma-separated CIDR ranges, e.g., "10.0.0.0/8,192.168.1.0/24"
ADMIN_ALLOWLIST_CIDR=

# Enable IP reading from reverse proxy headers (default: true in production)
ENABLE_TRUST_PROXY=true
```

**Example Setup:**
```env
# Allow internal office network and specific home office IP
ADMIN_ALLOWLIST_CIDR=10.0.0.0/8,192.168.1.0/24,203.0.113.50
```

**How It Works:**
1. Client IP is identified (from socket or X-Forwarded-For if behind proxy)
2. IP is checked against CIDR allowlist
3. If not in list: 403 Forbidden returned
4. **Note:** Authentication as admin role is STILL required—this adds an additional IP-based check

**NGINX Integration:**
See `deploy/nginx.conf.example` for NGINX-level IP restriction that complements this middleware.

**Verification:**
```bash
# From allowed IP (e.g., 127.0.0.1 in development)
curl -H "Authorization: Bearer <token>" http://localhost:4000/api/admin/dashboard

# From denied IP (if allowlist configured)
# Should return 403 Forbidden
```

---

### 6. Secure Cookies

**What:** Set secure flags on session and auth cookies for transport and storage security.

**Flags Set:**
| Flag | Value | Purpose |
|------|-------|---------|
| `httpOnly` | true | Cookie inaccessible to JavaScript (prevents XSS attacks) |
| `sameSite` | strict | Cookie not sent in cross-site requests (CSRF protection) |
| `secure` | true (prod only) | Cookie only sent over HTTPS |

**For JWT in Cookies:**
If using JWT stored in cookies, ensure the same flags are set in `res.cookie()` calls in controllers:

```javascript
res.cookie('authToken', token, {
  httpOnly: true,
  sameSite: 'strict',
  secure: process.env.NODE_ENV === 'production'
});
```

**Proxy Transparency:**
```env
# Enable when behind reverse proxy with TLS offload
ENABLE_TRUST_PROXY=true  # Default: true in production
```

This ensures `secure` cookies work correctly when HTTPS is terminated at the proxy level.

---

### 7. Rate Limiting / DoS Mitigation

**What:** Limit request rate per IP to prevent DoS and brute-force attacks.

**Global Limits (Default):**
- **Window:** 15 minutes
- **Max Requests:** 200 per IP per window

**Configuration:**
```env
# Time window in milliseconds (default: 900000 = 15 minutes)
RATE_LIMIT_WINDOW_MS=900000

# Max requests per window (default: 200)
RATE_LIMIT_MAX=200
```

**Endpoints with Stricter Limits (Optional):**
- `/api/auth/login` and `/api/auth/register` should have stricter limits (default: 3-5 per minute)
- Configure in `src/index.ts` by adding endpoint-specific limiters

**How It Works:**
1. Request arrives, IP is identified
2. Count of requests from that IP in current window is checked
3. If exceeded: 429 Too Many Requests
4. Headers included:
   - `RateLimit-Limit`: Max requests
   - `RateLimit-Remaining`: Requests left
   - `RateLimit-Reset`: Unix timestamp when window resets

**Verification:**
```bash
# Test rate limit
for i in {1..210}; do
  curl http://localhost:4000/health
done

# You should see:
# - 200 successful responses (2xx)
# - 10 rejected responses (429) in batch
# - RateLimit-* headers in responses
```

---

### 8. Trust Proxy (Reverse Proxy Support)

**What:** When running behind a reverse proxy (NGINX) with TLS termination, read client IP and protocol correctly.

**Why Important:**
- Without this, Express sees proxy as the client IP
- `secure` cookies won't work with TLS offload
- IP-based filtering (rate limit, allowlist) fails

**Configuration:**
```env
ENABLE_TRUST_PROXY=true  # Default: true in production, false in development
```

**When Behind NGINX:**
1. NGINX adds `X-Forwarded-For`, `X-Forwarded-Proto`, `X-Forwarded-Host` headers
2. Express reads these headers to identify real client
3. Middleware uses real IP for rate limiting and allowlisting

**NGINX Configuration:**
See `deploy/nginx.conf.example`:
```nginx
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Real-IP $remote_addr;
```

---

### 9. WAF / Reverse Proxy Guidance

**File:** `deploy/nginx.conf.example`

**Features:**
- Hide NGINX version (`server_tokens off;`)
- Disable directory listing (`autoindex off;`)
- Block dangerous HTTP methods (TRACE, CONNECT)
- Rate limiting zones (general, auth, admin)
- Admin route IP allowlist
- HTTPS/SSL configuration
- Security headers as backup to Helmet

**Setup Instructions:**
1. Customize `server_name` and `upstream` values
2. Obtain SSL certificates (Let's Encrypt recommended)
3. Copy to `/etc/nginx/sites-available/ccit-wall`
4. Create symlink: `ln -s /etc/nginx/sites-available/ccit-wall /etc/nginx/sites-enabled/`
5. Test: `nginx -t`
6. Reload: `systemctl reload nginx`

---

## Environment Variables Summary

Create a `.env` file in `backend/` based on `.env.example`:

```env
# Basic
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb://localhost:27017/ccit-wall
JWT_SECRET=your-secure-secret-key
CLIENT_URL=https://your-domain.com

# Security
ENABLE_CORS=false
ENABLE_ETAG=false
ENABLE_CSP=false
ENABLE_TRUST_PROXY=true
ADMIN_ALLOWLIST_CIDR=10.0.0.0/8,192.168.1.0/24

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=200

# Debug (development only)
DEBUG=false
```

---

## Testing Security Features

### Run Tests

```bash
# Install dependencies
cd backend
npm install

# Run security tests
npm test

# Run specific test suite
npm test -- security.headers.test.ts
npm test -- security.methods.test.ts
npm test -- security.ipallowlist.test.ts
npm test -- security.ratelimit.test.ts
```

### Manual Verification Checklist

```bash
# 1. Headers
curl -I http://localhost:4000/health | grep -E "X-Frame|X-Content|Referrer"
# Expected: X-Frame-Options: SAMEORIGIN, X-Content-Type-Options: nosniff, etc.

# 2. No fingerprinting
curl -I http://localhost:4000/health | grep -i "x-powered-by"
# Expected: (empty, no header)

curl -I http://localhost:4000/health | grep -i "etag"
# Expected: (empty, no header, unless ENABLE_ETAG=true)

# 3. Method restriction
curl -X DELETE http://localhost:4000/health
# Expected: 405 Method Not Allowed

# 4. Rate limiting
for i in {1..210}; do curl http://localhost:4000/health; done
# Expected: ~200 success, ~10 reject with 429

# 5. Admin allowlist (if ADMIN_ALLOWLIST_CIDR is set)
curl -H "Authorization: Bearer <token>" http://localhost:4000/api/admin/dashboard
# Expected: 403 if IP not in allowlist, 200 if in allowlist and auth valid
```

---

## Production Deployment Checklist

- [ ] `NODE_ENV=production` is set
- [ ] `JWT_SECRET` is a strong, unique secret (not the default)
- [ ] `CLIENT_URL` is set to your frontend domain (not localhost)
- [ ] `ENABLE_TRUST_PROXY=true` (if behind NGINX/proxy)
- [ ] `ADMIN_ALLOWLIST_CIDR` is configured for your network
- [ ] HTTPS/TLS is enabled (NGINX handles this)
- [ ] Database connection is secured (auth credentials set)
- [ ] Logs are monitored and stored securely
- [ ] Regular security updates are applied
- [ ] `.env` file is not committed to version control
- [ ] Rate limits are tuned for your traffic patterns

---

## Disabling Features (If Needed)

If a security feature causes issues, you can disable it via environment variables:

| Feature | Disable With | Risk |
|---------|--------------|------|
| Trust Proxy | `ENABLE_TRUST_PROXY=false` | May cause incorrect rate limiting behind proxy |
| Rate Limit | Set `RATE_LIMIT_MAX` to very high value | Increases DoS risk |
| Method Restriction | Remove middleware from `src/index.ts` | Allows PUT/DELETE at HTTP layer |
| Helmet Headers | Remove from `src/index.ts` | Increases vulnerability to attacks |
| IP Allowlist | Don't set `ADMIN_ALLOWLIST_CIDR` | No IP-based protection for admin routes |

---

## References & Further Reading

- **OWASP Top 10:** https://owasp.org/www-project-top-ten/
- **Helmet.js:** https://helmetjs.github.io/
- **Express Rate Limit:** https://github.com/nfriedly/express-rate-limit
- **NIST Security Guidelines:** https://csrc.nist.gov/
- **Node.js Security:** https://nodejs.org/en/docs/guides/security/

---

## Support & Issues

If you encounter issues with security features:

1. Check the logs: `NODE_ENV=development DEBUG=true npm run dev`
2. Verify environment variables are set correctly
3. Review test failures: `npm test`
4. Check NGINX configuration: `nginx -t`
5. Consult the detailed comments in `src/index.ts` and `src/middleware/security.ts`

---

**Last Updated:** January 2026  
**Version:** 1.0.0  
**Security Focus:** MERN Stack Hardening (Zero Breaking Changes)
