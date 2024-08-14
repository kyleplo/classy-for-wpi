import { ClassRow, JsonResponse } from "../util";
import { InteractionResponseFlags, InteractionResponseType } from "discord-interactions";
import { dorms } from "../db";

export async function dormCommand (env: Env, userId: string, options: Map<string, string>): Promise<Response> {
  const section = await env.DB.prepare("SELECT dorm, room FROM classes WHERE userId = ?").bind(options.get("user") || userId).first<ClassRow>();

  if (!section || !section.dorm) {
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: "<@" + options.get("user") + "> has not inputed a dorm.\nYou can input a dorm using the `setdorm` command.",
        allowed_mentions: {
          users: [options.get("user")]
        }
      }
    });
  }

  return new JsonResponse({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: "<@" + options.get("user") + "> lives at " + (section.room ? section.room + " - " : "") + dorms[section.dorm].name,
      allowed_mentions: {
        users: [options.get("user")]
      },
      flags: InteractionResponseFlags.EPHEMERAL
    }
  });
}