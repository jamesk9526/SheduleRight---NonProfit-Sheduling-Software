-- Add subdomain column/index for documents table (MySQL adapter uses documents for org lookup)

-- Add column if missing
SET @col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'documents'
    AND COLUMN_NAME = 'subdomain'
);

SET @add_col_sql := IF(@col_exists = 0,
  'ALTER TABLE documents ADD COLUMN subdomain VARCHAR(63) NULL',
  'SELECT 1'
);

PREPARE stmt FROM @add_col_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index if missing
SET @idx_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'documents'
    AND INDEX_NAME = 'idx_docs_subdomain'
);

SET @add_idx_sql := IF(@idx_exists = 0,
  'CREATE INDEX idx_docs_subdomain ON documents (type, subdomain)',
  'SELECT 1'
);

PREPARE stmt FROM @add_idx_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
