import { InteractionResponseType, InteractionResponseFlags } from "discord-interactions";
import { ClassRow, JsonResponse, getClassString } from "../util";

export async function classCommand(env: Env, userId: string, options: Map<string, string>): Promise<Response> {
  var users: D1Result<ClassRow>;
  if (options.has("section")) {
    users = await env.DB.prepare("SELECT userId FROM classes WHERE classId = ? AND sectionId = ?").bind(options.get("class"), options.get("section")).all<ClassRow>();
  } else {
    users = await env.DB.prepare("SELECT userId, sectionId FROM classes WHERE classId = ?").bind(options.get("class")).all<ClassRow>();
  }

  if (users.results.length === 0) {
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: "Nobody is currently registered for " + getClassString(options.get("class") as string, options.get("section")),
        flags: InteractionResponseFlags.EPHEMERAL
      }
    });
  }

  const userIds: { [userId: string]: string[]; } = {};
  users.results.forEach(user => {
    if (userIds[user.userId as string]) {
      userIds[user.userId as string].push(user.sectionId as string);
    } else {
      userIds[user.userId as string] = [user.sectionId as string];
    }
  });

  return new JsonResponse({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: (Object.keys(userIds).length > 1 ? Object.keys(userIds).length + " people are" : "1 person is") + " registered for " + getClassString(options.get("class") as string, options.get("section")) + ":" + Object.entries(userIds).map(value => "\n- <@" + value[0] + ">" + (options.get("section") ? "" : " (" + value[1].map(sectionId => options.get("class") + "-" + sectionId).join(", ") + ")")).join(""),
      allowed_mentions: {
        users: Object.keys(userIds)
      },
      flags: InteractionResponseFlags.EPHEMERAL
    }
  });
}