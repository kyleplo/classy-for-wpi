import { InteractionResponseFlags, InteractionResponseType } from "discord-interactions";
import { ClassRow, JsonResponse, organizeClassList } from "../util";
import { terms } from "../db";

export async function listCommand(env: Env, userId: string, options: Map<string, string>): Promise<Response> {
  var sections;
  if(options.has("term")){
    sections = await env.DB.prepare("SELECT classId, sectionId FROM classes WHERE userId = ? AND (term = ? OR term = ?)").bind(options.get("user") || userId, options.get("term"), terms[options.get("term") as string].partOf).all<ClassRow>();
  }else{
    sections = await env.DB.prepare("SELECT classId, sectionId FROM classes WHERE userId = ?").bind(options.get("user") || userId).all<ClassRow>();
  }
  

  const classList = organizeClassList(sections.results);

  if (classList.length === 0) {
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: (options.has("user") ? "<@" + options.get("user") + "> is" : "You are") + " not registered for any classes." + (options.has("user") ? "" : "\nYou can import classes from Workday with the `import` command, or add tbem manually with the `addclass` command."),
        allowed_mentions: {
          users: options.has("user") ? [options.get("user")] : []
        }
      }
    });
  }

  return new JsonResponse({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: (options.has("user") ? "<@" + options.get("user") + "> is" : "You are") + " in " + (classList.length === 1 ? "1 class" : classList.length + " classes") + "\n- " + classList.join("\n- "),
      allowed_mentions: {
        users: options.has("user") ? [options.get("user")] : []
      },
      flags: options.has("user") ? InteractionResponseFlags.EPHEMERAL : 0
    }
  });
}