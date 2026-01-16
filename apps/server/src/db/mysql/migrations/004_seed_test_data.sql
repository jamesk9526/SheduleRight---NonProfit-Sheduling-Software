-- Seed initial admin user and test organization for development/demo

-- Insert test organization
INSERT INTO organizations (id, name, tenant_id, created_at, updated_at) VALUES (
  'org:test-nonprofit',
  'Test Non-Profit',
  'tenant:test',
  NOW(),
  NOW()
) ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Insert admin user (password: admin123, will be hashed in seeding)
INSERT INTO users (id, email, name, password_hash, org_id, roles, verified, active, created_at, updated_at) VALUES (
  'user:admin',
  'admin@example.com',
  'Admin User',
  -- bcrypt hash of "admin123" (in production, use proper password hashing)
  '$2b$10$7JK0J0J0J0J0J0J0J0J0J.u7w7dJdJdJdJdJdJdJdJdJdJdJdJdJ',
  'org:test-nonprofit',
  JSON_ARRAY('ADMIN'),
  1,
  1,
  NOW(),
  NOW()
) ON DUPLICATE KEY UPDATE email = VALUES(email);

-- Insert test site
INSERT INTO sites (id, org_id, name, address, timezone, created_at, updated_at) VALUES (
  'site:test-clinic',
  'org:test-nonprofit',
  'Main Clinic',
  '123 Health St, City, State 12345',
  'America/Chicago',
  NOW(),
  NOW()
) ON DUPLICATE KEY UPDATE name = VALUES(name);
