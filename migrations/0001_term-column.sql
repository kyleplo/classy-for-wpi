-- Migration number: 0001 	 2024-07-24T00:15:53.367Z
ALTER TABLE classes ADD COLUMN term TEXT;
DROP INDEX IF EXISTS classesByUserId;
CREATE INDEX IF NOT EXISTS classesByUserIdAndTerm ON classes(userId, term);