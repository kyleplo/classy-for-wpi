import { InteractionResponseFlags, InteractionResponseType } from "discord-interactions";
import { JsonResponse } from "../util";

export async function removeClassCommand (env: Env, userId: string, options: Map<string, string>): Promise<Response> {
  if(options.has("section1") || options.has("section2") || options.has("section3")){
    const batch: D1PreparedStatement[] = [];
    for(var i = 1;i <= 3;i++){
      if(options.has("section" + i)){
        batch.push(env.DB.prepare("DELETE FROM classes WHERE userId = ? AND classId = ? AND sectionId = ?").bind(userId, options.get("class"), options.get("section" + i)))
      }
    }

    await env.DB.batch(batch);
  }else{
    await env.DB.prepare("DELETE FROM classes WHERE userId = ? AND classId = ?").bind(userId, options.get("class")).run();
  }

  return new JsonResponse({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: "Successfully removed from class",
      flags: InteractionResponseFlags.EPHEMERAL
    }
  });
}