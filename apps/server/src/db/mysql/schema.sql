-- ScheduleRight MySQL Schema (initial)

CREATE DATABASE IF NOT EXISTS scheduleright;
USE scheduleright;

CREATE TABLE IF NOT EXISTS organizations (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  tenant_id VARCHAR(64) NOT NULL,
  settings JSON NULL,
  branding JSON NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  org_id VARCHAR(64) NOT NULL,
  roles JSON NOT NULL,
  verified TINYINT(1) NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX idx_users_org (org_id)
);

CREATE TABLE IF NOT EXISTS sites (
  id VARCHAR(64) PRIMARY KEY,
  org_id VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  address TEXT NULL,
  timezone VARCHAR(64) NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX idx_sites_org (org_id)
);

CREATE TABLE IF NOT EXISTS availability (
  id VARCHAR(64) PRIMARY KEY,
  site_id VARCHAR(64) NOT NULL,
  org_id VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  capacity INT NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX idx_availability_site (site_id, status, start_time)
);

CREATE TABLE IF NOT EXISTS bookings (
  id VARCHAR(64) PRIMARY KEY,
  site_id VARCHAR(64) NOT NULL,
  org_id VARCHAR(64) NOT NULL,
  slot_id VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL,
  client_name VARCHAR(255) NOT NULL,
  client_email VARCHAR(255) NOT NULL,
  notes TEXT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX idx_bookings_site (site_id, status, created_at),
  INDEX idx_bookings_client (client_email, created_at)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(128) PRIMARY KEY,
  action VARCHAR(128) NOT NULL,
  user_id VARCHAR(64) NULL,
  org_id VARCHAR(64) NULL,
  resource_type VARCHAR(64) NULL,
  resource_id VARCHAR(64) NULL,
  details JSON NULL,
  ip_address VARCHAR(64) NULL,
  user_agent TEXT NULL,
  success TINYINT(1) NOT NULL DEFAULT 1,
  error_message TEXT NULL,
  created_at DATETIME NOT NULL,
  INDEX idx_audit_org (org_id, action, created_at)
);

CREATE TABLE IF NOT EXISTS system_config (
  id VARCHAR(64) PRIMARY KEY,
  data JSON NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS system_bootstrap (
  id VARCHAR(64) PRIMARY KEY,
  completed TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

-- Generic document store for CouchDB-like access
CREATE TABLE IF NOT EXISTS documents (
  id VARCHAR(128) PRIMARY KEY,
  type VARCHAR(64) NOT NULL,
  data JSON NOT NULL,
  org_id VARCHAR(64) NULL,
  site_id VARCHAR(64) NULL,
  email VARCHAR(255) NULL,
  status VARCHAR(32) NULL,
  slot_id VARCHAR(64) NULL,
  client_email VARCHAR(255) NULL,
  timestamp DATETIME NULL,
  entity_type VARCHAR(64) NULL,
  entity_id VARCHAR(128) NULL,
  property_id VARCHAR(128) NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX idx_docs_type (type),
  INDEX idx_docs_email (type, email),
  INDEX idx_docs_org (type, org_id),
  INDEX idx_docs_site (type, site_id),
  INDEX idx_docs_slot (type, slot_id),
  INDEX idx_docs_client (type, client_email),
  INDEX idx_docs_status (type, status),
  INDEX idx_docs_timestamp (type, timestamp),
  INDEX idx_docs_entity (type, entity_type, entity_id),
  INDEX idx_docs_property (type, property_id)
);
