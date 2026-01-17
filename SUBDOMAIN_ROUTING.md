# Subdomain Routing & Multi-Tenant Support

## Overview

ScheduleRight supports multi-tenant subdomain routing, allowing organizations to access their instance through custom subdomains (e.g., `acme.scheduleright.com`, `nonprofitxyz.scheduleright.com`).

This document explains the architecture, configuration, and usage of the subdomain routing system.

## Architecture

### How It Works

1. **Request Reception**: When a user accesses `org1.scheduleright.com`, the request includes the hostname
2. **Subdomain Extraction**: The `subdomain` middleware extracts "org1" from the hostname
3. **Organization Lookup**: The middleware queries the database for an organization with subdomain "org1"
4. **Request Enrichment**: If found, the organization ID is attached to the request context
5. **Authentication Override**: When users authenticate, their `orgId` is overridden with the subdomain's organization
6. **Data Isolation**: All subsequent queries use the subdomain organization ID, ensuring data isolation

### Key Components

```
Request → extractSubdomain() → Database Lookup → Request Context
                                                       ↓
                            → Authentication Middleware
                                                       ↓
                            → Override orgId from subdomain
                                                       ↓
                            → Route Handler (data isolated to org)
```

## Configuration

### DNS Setup

To enable subdomain routing in production, configure your DNS with a wildcard record:

```bash
# In your DNS provider (Route53, Cloudflare, etc.)
*.scheduleright.com  A  <YOUR_IP_ADDRESS>
scheduleright.com    A  <YOUR_IP_ADDRESS>
```

This allows all subdomains to point to your server. The server determines which organization to serve based on the subdomain.

### Environment Variables

No special environment variables are required. The subdomain feature is enabled by default.

To disable subdomain routing (not recommended), you would need to modify the middleware registration in `index.ts`.

### Database Schema

Organizations now have an optional `subdomain` field:

```sql
ALTER TABLE organizations ADD COLUMN subdomain VARCHAR(63) UNIQUE NULL;
CREATE INDEX idx_organizations_subdomain ON organizations(subdomain);
```

**Constraints:**
- `UNIQUE`: Each subdomain can only be assigned to one organization
- `NULL`: Subdomains are optional; organizations work without them
- `VARCHAR(63)`: Maximum length for DNS labels per RFC 1035

**Subdomain Format:**
- Alphanumeric characters (a-z, 0-9)
- Hyphens (-) allowed but not at start/end
- Minimum 2 characters
- Maximum 63 characters
- Case-insensitive (recommend lowercase)

## API Endpoints

### Set Organization Subdomain

```http
PUT /api/v1/orgs/:orgId/subdomain
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "subdomain": "acme"
}
```

**Response (Success):**
```json
{
  "message": "Subdomain set to: acme.scheduleright.com",
  "data": {
    "_id": "org:123",
    "name": "ACME Corp",
    "subdomain": "acme",
    ...
  }
}
```

**Response (Conflict):**
```json
{
  "error": "Subdomain is invalid or already taken",
  "code": "INVALID_SUBDOMAIN",
  "statusCode": 400
}
```

### Remove Organization Subdomain

```http
PUT /api/v1/orgs/:orgId/subdomain
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "subdomain": null
}
```

This removes the subdomain assignment and allows the organization to be accessed only via the main domain.

## Usage Examples

### Setup Example

1. **Organization admin sets subdomain:**
   ```bash
   curl -X PUT http://scheduleright.com/api/v1/orgs/org:123/subdomain \
     -H "Authorization: Bearer $ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"subdomain": "acme"}'
   ```

2. **DNS record created:**
   ```
   *.scheduleright.com → 192.168.1.100
   ```

3. **User accesses via subdomain:**
   ```
   https://acme.scheduleright.com/login
   ```

4. **Request flow:**
   - Middleware extracts "acme" from hostname
   - Queries database for org with subdomain="acme"
   - Finds organization ID "org:123"
   - User logs in (JWT token issued)
   - Upon request, orgId overridden to "org:123"
   - User sees only ACME data

### Access Without Subdomain

Organizations without a subdomain assignment continue to work with standard URL-based organization switching:

```
https://scheduleright.com/orgs/org:456/bookings
```

Or if logged in with multi-org support:
```
https://scheduleright.com/dashboard  (shows my organizations)
```

## Security Considerations

### Data Isolation

- ✅ **Enforced**: Subdomain org is checked on every authenticated request
- ✅ **Override**: Users cannot access other org data by changing orgId in tokens
- ✅ **Unique**: Only one organization per subdomain

### Subdomain Verification

- ✅ **Validation**: Subdomains must match DNS label rules (alphanumeric + hyphens)
- ✅ **Uniqueness**: Enforced at database level with UNIQUE constraint
- ✅ **Case Handling**: Subdomains are case-insensitive (stored lowercase)

### Attack Surface

**Hostname Spoofing:**
- HTTP header `Host` is used to extract subdomain
- In production, configure reverse proxy (nginx, CloudFlare) to validate hosts
- Only accept requests for known domains

**Example Nginx configuration:**
```nginx
server {
    server_name *.scheduleright.com scheduleright.com;
    
    # Reject if Host header is malformed
    if ($host ~* [^a-zA-Z0-9\.\-]) {
        return 400;
    }
    
    proxy_pass http://app:5710;
    proxy_set_header Host $host;
}
```

## Troubleshooting

### Subdomain Not Working

**Check 1: DNS Resolution**
```bash
nslookup acme.scheduleright.com
# Should return your server IP
```

**Check 2: Organization Config**
```bash
curl -X GET http://scheduleright.com/api/v1/orgs/org:123 \
  -H "Authorization: Bearer $TOKEN" | jq '.data.subdomain'
# Should return "acme"
```

**Check 3: Middleware Logs**
```bash
curl -H "Host: acme.scheduleright.com" http://localhost:5710/health
# Check server logs for subdomain extraction
```

### Users See Wrong Organization

**Cause**: Token issued for different org, subdomain override not working

**Fix**: 
1. Verify subdomain is set correctly: `GET /api/v1/orgs/:orgId`
2. Check middleware is registered: See `index.ts` line ~195
3. Clear browser cache and re-login

### Subdomain Assignment Fails

**Cause 1**: Subdomain already taken
```bash
curl -X PUT http://scheduleright.com/api/v1/orgs/org:123/subdomain \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"subdomain": "acme"}' | jq '.code'
# Returns: INVALID_SUBDOMAIN
```

**Fix**: Check what org has the subdomain:
```sql
SELECT _id, name, subdomain FROM organizations WHERE subdomain = 'acme';
```

**Cause 2**: Invalid subdomain format
```bash
# ❌ Invalid: starts with number
{"subdomain": "123org"}

# ❌ Invalid: contains underscore
{"subdomain": "my_org"}

# ❌ Invalid: too short
{"subdomain": "x"}

# ✅ Valid: lowercase alphanumeric
{"subdomain": "myorg"}

# ✅ Valid: with hyphens
{"subdomain": "my-org"}
```

## Migration Guide

### For Existing Organizations

To migrate existing organizations to subdomain routing:

1. **Audit current organizations:**
   ```sql
   SELECT _id, name FROM organizations WHERE type = 'org' LIMIT 20;
   ```

2. **Assign subdomains based on organization names:**
   ```bash
   # For "ACME Corp" organization (id: org:123)
   curl -X PUT http://scheduleright.com/api/v1/orgs/org:123/subdomain \
     -H "Authorization: Bearer $ADMIN_TOKEN" \
     -d '{"subdomain": "acme"}'
   ```

3. **Test each subdomain:**
   ```bash
   curl -H "Host: acme.scheduleright.com" http://localhost:5710/health
   ```

4. **Update user documentation** to use new subdomain URLs

### Gradual Rollout

You can enable subdomains gradually:

1. Set subdomains for high-value clients first
2. Keep main domain accessible without subdomains
3. Monitor subdomain access in metrics
4. Eventually migrate all users to subdomains

## Performance Impact

### Database Queries

- **Per-request overhead**: One additional query per authenticated request
- **Optimization**: Subdomain lookup uses indexed `subdomain` column (O(log n))
- **Caching**: Consider adding subdomain->orgId cache layer for high traffic

```typescript
// Future optimization: Add Redis cache
const cachedOrg = await redis.get(`subdomain:${subdomain}`)
```

### Bandwidth

- **Impact**: Negligible - hostname is already in HTTP headers
- **No additional data transfer**

## Future Enhancements

### 1. Custom Domains

Support fully custom domains like `acme.com` pointing to org:

```typescript
// Map custom domain to organization
"custom_domains": ["acme.com", "acme-scheduling.com"]
```

### 2. Subdomain Aliases

Allow multiple subdomains for same org:

```typescript
{
  "primary_subdomain": "acme",
  "aliases": ["acme-corp", "acmex"]
}
```

### 3. Branding per Subdomain

Store subdomain-specific branding (logo, colors):

```typescript
{
  "subdomain": "acme",
  "subdomain_branding": {
    "logo_url": "https://cdn.example.com/acme-logo.png",
    "primary_color": "#0066cc"
  }
}
```

### 4. Analytics by Subdomain

Track access patterns per subdomain:

```sql
-- Track requests by subdomain
INSERT INTO subdomain_analytics (subdomain, orgId, timestamp)
VALUES (?, ?, NOW());
```

## Support & Questions

For issues or questions about subdomain routing:

1. Check the **Troubleshooting** section above
2. Review server logs for subdomain extraction errors
3. Verify DNS configuration with `nslookup` or `dig`
4. Contact support with:
   - Error message
   - Organization ID
   - Requested subdomain
   - Current DNS configuration

---

**Last Updated**: 2024
**Feature Status**: Production Ready
