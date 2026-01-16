-- Align with existing schema: add helpful indexes for users and organizations

-- Users: fast lookup by org + email
CREATE INDEX IF NOT EXISTS idx_users_org_email ON users(org_id, email);

-- Organizations: tenant-based lookup
CREATE INDEX IF NOT EXISTS idx_organizations_tenant ON organizations(tenant_id);
