ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS entity_type VARCHAR(64) NULL,
  ADD COLUMN IF NOT EXISTS entity_id VARCHAR(128) NULL,
  ADD COLUMN IF NOT EXISTS property_id VARCHAR(128) NULL;

CREATE INDEX idx_docs_entity ON documents (type, entity_type, entity_id);
CREATE INDEX idx_docs_property ON documents (type, property_id);
