import { InteractionResponseFlags, InteractionResponseType } from "discord-interactions";
import { JsonResponse, lazyEncrypt } from "../util";

export async function importCommand(env: Env, userId: string, options: Map<string, string>): Promise<Response> {
  return new JsonResponse({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: `In Workday, open your course list and download your courses as an Excel spreadsheet. Then use [this page](https://classy.kyleplo.workers.dev/upload?key=${lazyEncrypt(userId)}) to upload the Excel spreadsheet you just downloaded.`,
      flags: InteractionResponseFlags.EPHEMERAL
    }
  });
}