import { InteractionResponseType, InteractionResponseFlags } from "discord-interactions";
import { ClassRow, JsonResponse, getClassString } from "../util";
import { dorms } from "../db";

export async function classCommand(env: Env, userId: string, options: Map<string, string>): Promise<Response> {
  if(options.has("dorm") && !dorms[options.get("dorm") as string]){
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: "Invalid dorm building selection",
        flags: InteractionResponseFlags.EPHEMERAL
      }
    });
  }

  var users: D1Result<ClassRow>;
  if (options.has("dorm")) {
    if (options.has("section")) {
      users = await env.DB.prepare("SELECT userId, room FROM classes WHERE dorm = ? AND classId = ? AND sectionId = ?").bind(options.get("dorm"), options.get("class"), options.get("section")).all<ClassRow>();
    } else {
      users = await env.DB.prepare("SELECT userId, sectionId, room FROM classes WHERE dorm = ? AND classId = ?").bind(options.get("dorm"), options.get("class")).all<ClassRow>();
    }
  } else {
    if (options.has("section")) {
      users = await env.DB.prepare("SELECT userId FROM classes WHERE classId = ? AND sectionId = ?").bind(options.get("class"), options.get("section")).all<ClassRow>();
    } else {
      users = await env.DB.prepare("SELECT userId, sectionId FROM classes WHERE classId = ?").bind(options.get("class")).all<ClassRow>();
    }
  }

  if (users.results.length === 0) {
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: "Nobody" + (options.has("dorm") ? " at " + dorms[options.get("dorm") as string].name : "") + " is currently registered for " + getClassString(options.get("class") as string, options.get("section")) + "\nYou can import classes from Workday with the `import` command, or add tbem manually with the `addclass` command.",
        flags: InteractionResponseFlags.EPHEMERAL
      }
    });
  }

  const userIds: { [userId: string]: {sections: string[], room?: string }} = {};
  users.results.forEach(user => {
    if (userIds[user.userId as string]) {
      userIds[user.userId as string].sections.push(user.sectionId as string);
    } else {
      userIds[user.userId as string] = {sections: [user.sectionId as string], room: user.room};
    }
  });

  return new JsonResponse({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: (Object.keys(userIds).length > 1 ? Object.keys(userIds).length + " people" : "1 person") + (options.has("dorm") ? " at " + dorms[options.get("dorm") as string].name : "") + (Object.keys(userIds).length > 1 ? " are" : " is") + " registered for " + getClassString(options.get("class") as string, options.get("section")) + ":" + Object.entries(userIds).map(value => "\n- <@" + value[0] + ">" + (value[1].room ? " (" + value[1].room + ")" : (options.get("section") ? "" : " (" + value[1].sections.map(sectionId => options.get("class") + "-" + sectionId).join(", ") + ")"))).join(""),
      allowed_mentions: {
        users: Object.keys(userIds)
      },
      flags: InteractionResponseFlags.EPHEMERAL
    }
  });
}