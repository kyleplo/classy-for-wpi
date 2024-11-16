import { ClassRow } from "./util";

export async function removeDuplicateRows(env: Env): Promise<void> {
  const sections = await env.DB.prepare("SELECT * FROM classes").all<ClassRow>();
  const seen = new Set<string>();

  const batch: D1PreparedStatement[] = [];

  sections.results.forEach(section => {
    if (seen.has(section.userId + section.classId + section.sectionId)) {
      batch.push(env.DB.prepare("DELETE FROM classes WHERE RowID = ?").bind(section.RowID));
    } else {
      seen.add(section.userId + section.classId + section.sectionId);
    }
  });

  console.log("deleting " + batch.length + " rows");
  await env.DB.batch(batch);
}