import { InteractionResponseFlags, InteractionResponseType } from "discord-interactions";
import { JsonResponse, parseClassCode } from "../util";
import exceljs from 'exceljs';
import { classes } from "../db";

export async function importCommand(env: Env, userId: string, options: Map<string, string>): Promise<Response> {
  if(!options.has("file")){
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: "In Workday, open your course list and download your courses as an Excel spreadsheet. Then use the `/import` command again with the `file` option and upload your file.\nBy default, this command will override your existing class list. Set the `keep` option to `false` to keep your existing classes alongside the imported ones.",
        flags: InteractionResponseFlags.EPHEMERAL
      }
    });
  }

  try {
    const attachment = options.get("file") as unknown as {url: string, size: number};

    if(attachment.size > 15000){
      return new JsonResponse({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `Failed to parse your course list, file is too large.`,
          flags: InteractionResponseFlags.EPHEMERAL
        }
      });
    }

    const file = await fetch(attachment.url).then(r => r.arrayBuffer());
    const workbook = new exceljs.Workbook();
    const sheet = await workbook.xlsx.load(file);

    if(sheet.worksheets.length !== 1 || (sheet.worksheets[0].name !== "View My Courses" && sheet.worksheets[0].name !== "Sheet1")){
      return new JsonResponse({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `Failed to parse your course list, use the other Export button on Workday and try again.`,
          flags: InteractionResponseFlags.EPHEMERAL
        }
      });
    }

    const batch: D1PreparedStatement[] = [];

    sheet.worksheets[0].eachRow(row => {
      if(!Array.isArray(row.values)){
        return;
      }

      if(row.values[8] === "Registered" && row.values[7]){
        try {
          const year = new Date(row.values[13] as string).getFullYear().toString();
          const section = parseClassCode(row.values[7].toString(), year);

          if(!section){
            return;
          }
          batch.push(env.DB.prepare("INSERT INTO classes (userId, classId, sectionId, term)\nVALUES (?, ?, ?, ?)").bind(userId, section.course, section.section, classes[section.course].years[year][section.section].term));
        } catch (_) {}
      }
    });

    if(batch.length){
      const classCount = batch.length;
      if(!options.has("keep") || !options.get("keep")){
        batch.unshift(env.DB.prepare("DELETE FROM classes WHERE userId = ?").bind(userId));
      }

      await env.DB.batch(batch);

      return new JsonResponse({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `Successfully imported ${classCount} class sections.`
        }
      });
    }else{
      return new JsonResponse({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `Failed to extract courses from your course list, use the other Export button on Workday and try again.`,
          flags: InteractionResponseFlags.EPHEMERAL
        }
      });
    }
  } catch {
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: `Failed to load your course list, please try again later.`,
        flags: InteractionResponseFlags.EPHEMERAL
      }
    });
  }
}