import { dorms } from "../db";
import { JsonResponse } from "../util";
import { InteractionResponseFlags, InteractionResponseType } from "discord-interactions";

export async function setDormCommand (env: Env, userId: string, options: Map<string, string>): Promise<Response> {
  if(options.has("room") && !options.has("dorm")){
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: "You must select a dorm building along with your room",
        flags: InteractionResponseFlags.EPHEMERAL
      }
    });
  }

  if(options.has("dorm") && !dorms[options.get("dorm") as string]){
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: "Invalid dorm building selection",
        flags: InteractionResponseFlags.EPHEMERAL
      }
    });
  }

  if(options.has("room") && ((options.get("room") as string).length < 1 || (options.get("room") as string).length > 50)){
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: "Invalid dorm room input",
        flags: InteractionResponseFlags.EPHEMERAL
      }
    });
  }

  const result = await env.DB.prepare("UPDATE classes SET dorm = ?, room = ? WHERE userId = ?").bind(options.get("dorm"), options.get("room"), userId).run();

  if(result.meta.rows_written === 0){
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: "You must have at least one class on your schedule before inputting your dorm.\nYou can import classes from Workday with the `import` command, or add tbem manually with the `addclass` command.",
        flags: InteractionResponseFlags.EPHEMERAL
      }
    });
  }

  if(!options.has("dorm")){
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: "Successfully cleared your dorm"
      }
    });
  }

  return new JsonResponse({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: "Successfully set your dorm to " + dorms[options.get("dorm") as string] + (options.has("room") ? " - " + options.get("room") : "")
    }
  });
}