DROP TABLE IF EXISTS classes;
CREATE TABLE IF NOT EXISTS classes (RowID INTEGER PRIMARY KEY, userId TEXT, classId TEXT, sectionId TEXT, term TEXT);
DROP INDEX IF EXISTS classesByClassAndSectionId;
CREATE INDEX IF NOT EXISTS classesByClassAndSectionId ON classes(classId, sectionId);
DROP INDEX IF EXISTS classesByUserId;
DROP INDEX IF EXISTS classesByUserIdAndTerm;
CREATE INDEX IF NOT EXISTS classesByUserIdAndTerm ON classes(userId, term);