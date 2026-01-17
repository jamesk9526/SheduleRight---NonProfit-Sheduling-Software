-- Add useful indexes to the documents table
-- Note: Execute each CREATE INDEX separately (no multiple statements in single query)

-- Index for type and organization queries
CREATE INDEX IF NOT EXISTS idx_documents_type_org ON documents(type, org_id);

-- Index for site-based queries
CREATE INDEX IF NOT EXISTS idx_documents_site ON documents(site_id);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_documents_email ON documents(email);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);

-- Index for timestamp sorting
CREATE INDEX IF NOT EXISTS idx_documents_timestamp ON documents(timestamp);
