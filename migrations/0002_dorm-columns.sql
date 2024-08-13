-- Migration number: 0002 	 2024-08-13T17:51:17.218Z
ALTER TABLE classes ADD COLUMN dorm TEXT;
ALTER TABLE classes ADD COLUMN room TEXT;
DROP INDEX IF EXISTS classesByDorm;
CREATE INDEX IF NOT EXISTS classesByDorm ON classes(dorm, classId, sectionId);