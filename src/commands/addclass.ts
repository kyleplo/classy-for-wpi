import { InteractionResponseFlags, InteractionResponseType } from "discord-interactions";
import { JsonResponse, getClassString } from "../util";
import { classes } from "../db";

export async function addClassCommand (env: Env, userId: string, options: Map<string, string>): Promise<Response> {
  if(!classes[options.get("class") as string]){
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: "Unknown class " + options.get("class"),
        flags: InteractionResponseFlags.EPHEMERAL
      }
    });
  }

  const batch: D1PreparedStatement[] = [];
  for(var i = 1;i <= 3;i++){
    if(options.has("section" + i)){
      if(!classes[options.get("class") as string].sections[options.get("section" + i) as string]){
        return new JsonResponse({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: "Unknown section " + options.get("section" + i),
            flags: InteractionResponseFlags.EPHEMERAL
          }
        });
      }

      batch.push(env.DB.prepare("INSERT INTO classes (userId, classId, sectionId, term)\nVALUES (?, ?, ?, ?)").bind(userId, options.get("class"), options.get("section" + i), classes[options.get("class") as string].sections[options.get("section" + i) as string].term))
    }
  }

  await env.DB.batch(batch);

  return new JsonResponse({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: "Successfully added to " + getClassString(options.get("class") as string)
    }
  });
}