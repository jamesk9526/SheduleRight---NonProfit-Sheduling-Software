-- Volunteers and shifts normalized tables for performance and integrity

CREATE TABLE IF NOT EXISTS volunteers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  volunteer_id VARCHAR(64) NOT NULL UNIQUE,
  org_id VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NULL,
  phone VARCHAR(64) NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_volunteers_org (org_id),
  CONSTRAINT fk_volunteers_organizations_org_id FOREIGN KEY (org_id) REFERENCES organizations(id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS shifts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  shift_id VARCHAR(64) NOT NULL UNIQUE,
  org_id VARCHAR(64) NOT NULL,
  site_id VARCHAR(64) NULL,
  name VARCHAR(255) NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  capacity INT NOT NULL DEFAULT 1,
  status VARCHAR(32) NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_shifts_org (org_id),
  INDEX idx_shifts_site (site_id),
  INDEX idx_shifts_time (start_time, end_time),
  CONSTRAINT fk_shifts_organizations_org_id FOREIGN KEY (org_id) REFERENCES organizations(id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS shift_assignments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  assignment_id VARCHAR(64) NOT NULL UNIQUE,
  org_id VARCHAR(64) NOT NULL,
  shift_id VARCHAR(64) NOT NULL,
  volunteer_id VARCHAR(64) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_assignments_shift (shift_id),
  INDEX idx_assignments_volunteer (volunteer_id),
  CONSTRAINT fk_assignments_shifts_shift_id FOREIGN KEY (shift_id) REFERENCES shifts(shift_id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_assignments_volunteers_volunteer_id FOREIGN KEY (volunteer_id) REFERENCES volunteers(volunteer_id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
