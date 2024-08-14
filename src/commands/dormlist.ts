import { InteractionResponseType, InteractionResponseFlags } from "discord-interactions";
import { ClassRow, JsonResponse } from "../util";
import { dorms } from "../db";

export async function dormListCommand(env: Env, userId: string, options: Map<string, string>): Promise<Response> {
  if(!dorms[options.get("dorm") as string]){
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: "Invalid dorm building selection",
        flags: InteractionResponseFlags.EPHEMERAL
      }
    });
  }

  const users = await env.DB.prepare("SELECT userId, room FROM classes WHERE dorm = ?").bind(options.get("dorm")).all<ClassRow>();

  if (users.results.length === 0) {
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: "Nobody has inputted living at " + dorms[options.get("dorm") as string].name + "\nUse the `setdorm` command to set your dorm.",
        flags: InteractionResponseFlags.EPHEMERAL
      }
    });
  }

  const userIds: { [userId: string]: string | undefined; } = {};
  users.results.forEach(user => {
    userIds[user.userId as string] = user.room;
  });

  return new JsonResponse({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: (Object.keys(userIds).length > 1 ? Object.keys(userIds).length + " people live" : "1 person lives") + " at " + dorms[options.get("dorm") as string].name + ":" + Object.entries(userIds).map(value => "\n- <@" + value[0] + ">" + (value[1] ? " (" + value[1] + ")" : "")).join(""),
      allowed_mentions: {
        users: Object.keys(userIds)
      },
      flags: InteractionResponseFlags.EPHEMERAL
    }
  });
}