import { ClassRow } from "./util";

export async function migrateTermColumn(env: Env): Promise<void> {
  const sections = await env.DB.prepare("SELECT * FROM classes WHERE term IS NULL").all<ClassRow>();

  const batch: D1PreparedStatement[] = [];

  sections.results.forEach(section => {
    batch.push(env.DB.prepare("UPDATE classes SET term = ? WHERE RowId = ?").bind(section.sectionId[0], section.RowID));
  });

  await env.DB.batch(batch);
}