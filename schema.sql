DROP TABLE IF EXISTS classes;
CREATE TABLE IF NOT EXISTS classes (RowID INTEGER PRIMARY KEY, userId TEXT, classId TEXT, sectionId TEXT);
DROP INDEX IF EXISTS classesByClassAndSectionId;
CREATE INDEX IF NOT EXISTS classesByClassAndSectionId ON classes(classId, sectionId);
DROP INDEX IF EXISTS classesByUserId;
CREATE INDEX IF NOT EXISTS classesByUserId ON classes(userId);