-- Migration: Enhanced client management with files and notes
-- Adds support for client profiles, file attachments, and communication notes

-- Client Profiles Table (extended client information)
CREATE TABLE IF NOT EXISTS client_profiles (
  id VARCHAR(36) PRIMARY KEY,
  orgId VARCHAR(36) NOT NULL,
  clientEmail VARCHAR(255) NOT NULL,
  firstName VARCHAR(100),
  lastName VARCHAR(100),
  dateOfBirth DATE,
  phone VARCHAR(32),
  address VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(2),
  zipCode VARCHAR(10),
  emergencyContactName VARCHAR(100),
  emergencyContactPhone VARCHAR(32),
  medicalHistory TEXT,
  notes TEXT,
  status ENUM('active', 'inactive', 'archived') DEFAULT 'active',
  customFields JSON,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  createdBy VARCHAR(36),
  UNIQUE KEY unique_email_per_org (orgId, clientEmail),
  INDEX idx_orgId (orgId),
  INDEX idx_status (status),
  INDEX idx_createdAt (createdAt)
);

-- Client Files Table (documents, images, etc.)
CREATE TABLE IF NOT EXISTS client_files (
  id VARCHAR(36) PRIMARY KEY,
  orgId VARCHAR(36) NOT NULL,
  clientId VARCHAR(36) NOT NULL,
  fileName VARCHAR(255) NOT NULL,
  fileType VARCHAR(50),
  fileSize INT,
  mimeType VARCHAR(100),
  s3Key VARCHAR(500),
  localPath VARCHAR(500),
  category VARCHAR(50),
  description TEXT,
  uploadedBy VARCHAR(36),
  uploadedAt DATETIME NOT NULL,
  expiresAt DATETIME,
  INDEX idx_clientId (clientId),
  INDEX idx_orgId (orgId),
  INDEX idx_category (category),
  INDEX idx_uploadedAt (uploadedAt),
  FOREIGN KEY (clientId) REFERENCES client_profiles(id) ON DELETE CASCADE
);

-- Client Notes Table (communication history)
CREATE TABLE IF NOT EXISTS client_notes (
  id VARCHAR(36) PRIMARY KEY,
  orgId VARCHAR(36) NOT NULL,
  clientId VARCHAR(36) NOT NULL,
  noteType ENUM('general', 'follow_up', 'medical', 'communication', 'appointment') DEFAULT 'general',
  title VARCHAR(255),
  content TEXT NOT NULL,
  tags JSON,
  createdBy VARCHAR(36),
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  isPrivate BOOLEAN DEFAULT FALSE,
  INDEX idx_clientId (clientId),
  INDEX idx_orgId (orgId),
  INDEX idx_noteType (noteType),
  INDEX idx_createdAt (createdAt),
  FOREIGN KEY (clientId) REFERENCES client_profiles(id) ON DELETE CASCADE
);

-- Add fields to track custom field definitions per organization
CREATE TABLE IF NOT EXISTS client_field_definitions (
  id VARCHAR(36) PRIMARY KEY,
  orgId VARCHAR(36) NOT NULL,
  fieldName VARCHAR(100) NOT NULL,
  fieldLabel VARCHAR(255),
  fieldType ENUM('text', 'number', 'date', 'select', 'checkbox', 'textarea') DEFAULT 'text',
  fieldOptions JSON,
  isRequired BOOLEAN DEFAULT FALSE,
  displayOrder INT,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  UNIQUE KEY unique_field_per_org (orgId, fieldName),
  INDEX idx_orgId (orgId),
  INDEX idx_displayOrder (displayOrder)
);
