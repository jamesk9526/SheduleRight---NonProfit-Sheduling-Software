-- Add useful indexes to the documents table
-- Note: Execute each CREATE INDEX separately (no multiple statements in single query)

-- Index for type and organization queries
DROP INDEX IF EXISTS idx_documents_type_org ON documents;
CREATE INDEX idx_documents_type_org ON documents(type, org_id);

-- Index for site-based queries
DROP INDEX IF EXISTS idx_documents_site ON documents;
CREATE INDEX idx_documents_site ON documents(site_id);

-- Index for email lookups
DROP INDEX IF EXISTS idx_documents_email ON documents;
CREATE INDEX idx_documents_email ON documents(email);

-- Index for status filtering
DROP INDEX IF EXISTS idx_documents_status ON documents;
CREATE INDEX idx_documents_status ON documents(status);

-- Index for timestamp sorting
DROP INDEX IF EXISTS idx_documents_timestamp ON documents;
CREATE INDEX idx_documents_timestamp ON documents(timestamp);
