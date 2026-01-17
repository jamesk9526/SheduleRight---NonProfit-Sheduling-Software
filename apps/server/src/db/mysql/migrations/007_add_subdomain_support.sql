-- Migration: Add subdomain support to organizations
-- Allows organizations to have custom subdomains like org1.scheduleright.com

ALTER TABLE organizations ADD COLUMN subdomain VARCHAR(63) UNIQUE NULL COMMENT 'Optional subdomain for multi-tenant routing (e.g., org1.scheduleright.com)';

-- Create index on subdomain for fast lookup
CREATE INDEX idx_organizations_subdomain ON organizations(subdomain);
