-- Columns entity_type, entity_id, property_id already exist in base schema
-- Just ensure the indexes are created

DROP INDEX IF EXISTS idx_docs_entity ON documents;
CREATE INDEX idx_docs_entity ON documents (type, entity_type, entity_id);
DROP INDEX IF EXISTS idx_docs_property ON documents;
CREATE INDEX idx_docs_property ON documents (type, property_id);
