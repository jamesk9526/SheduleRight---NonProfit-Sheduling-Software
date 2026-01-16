-- Add useful indexes to the documents table
CREATE INDEX IF NOT EXISTS idx_documents_type_org ON documents(type, org_id);
CREATE INDEX IF NOT EXISTS idx_documents_site ON documents(site_id);
CREATE INDEX IF NOT EXISTS idx_documents_email ON documents(email);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_timestamp ON documents(timestamp);
