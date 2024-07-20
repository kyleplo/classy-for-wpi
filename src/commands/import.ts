import { InteractionResponseFlags, InteractionResponseType } from "discord-interactions";
import { JsonResponse } from "../util";
import { encrypt } from "../crypto";

export async function importCommand(env: Env, userId: string, options: Map<string, string>): Promise<Response> {
  return new JsonResponse({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: `In Workday, open your course list and download your courses as an Excel spreadsheet. Then use the button below to upload the Excel spreadsheet you just downloaded.
-# This link is unique to you and should not be shared with anyone`,
      flags: InteractionResponseFlags.EPHEMERAL,
      components: {
        type: 1,
        components: [
          {
            type: 2,
            label: "Upload Your Courses",
            style: 5,
            link: `${env.BOT_LINK}/upload?key=${encodeURIComponent(await encrypt(env, userId))}`
          }
        ]
      }
    }
  });
}