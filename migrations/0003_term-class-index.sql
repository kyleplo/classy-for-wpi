-- Migration number: 0003 	 2025-03-01T19:58:46.424Z
DROP INDEX IF EXISTS classesByClassAndSectionId;
CREATE INDEX IF NOT EXISTS classesByClassAndSectionId ON classes(classId, sectionId, term);