import { InteractionResponseFlags, InteractionResponseType } from "discord-interactions";
import { JsonResponse } from "../util";
import { parse } from "node-xlsx";
import { classes } from "../db";

export async function importCommand(env: Env, userId: string, options: Map<string, string>): Promise<Response> {
  if(!options.has("file")){
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: "In Workday, open your course list and download your courses as an Excel spreadsheet. Then use the `/import` command again with the `file` option and upload your file.",
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
    const sheet = parse(file);

    if(sheet.length !== 1 || (sheet[0].name !== "View My Courses" && sheet[0].name !== "Sheet1") || (sheet[0].data[0][0] !== "My Enrolled Courses" && sheet[0].data[0][0] !== "View My Courses")){
      return new JsonResponse({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `Failed to parse your course list, use the other Export button on Workday and try again.`,
          flags: InteractionResponseFlags.EPHEMERAL
        }
      });
    }

    const batch: D1PreparedStatement[] = [];

    sheet[0].data.forEach(row => {
      if(row[8] === "Registered" && row[4]){
        const section = row[4].replace(" ", "").split(" ")[0].split("-");

        if(!classes[section[0]] || !classes[section[0]].sections[section[1]]){
          return;
        }
        batch.push(env.DB.prepare("INSERT INTO classes (userId, classId, sectionId)\nVALUES (?, ?, ?)").bind(userId, section[0], section[1]))
      }
    });

    if(batch.length){
      await env.DB.batch(batch);

      return new JsonResponse({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `Successfully imported ${batch.length} class sections.`,
          flags: InteractionResponseFlags.EPHEMERAL
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