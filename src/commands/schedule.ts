import { InteractionResponseFlags, InteractionResponseType } from "discord-interactions";
import { ClassRow, JsonResponse, organizeClassList } from "../util";

export async function scheduleCommand(env: Env, userId: string, options: Map<string, string>): Promise<Response> {
  const sections = await env.DB.prepare("SELECT classId, sectionId FROM classes WHERE userId = ?").bind(options.get("user") || userId).all<ClassRow>();

  const classList = organizeClassList(sections.results);

  if (classList.length === 0) {
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: (options.has("user") ? "<@" + options.get("user") + "> is" : "You are") + " not registered for any classes." + (options.has("user") ? "" : "\nYou can add classes with the `addclass` command or import them from Workday with the `import` command."),
        allowed_mentions: {
          users: options.has("user") ? [options.get("user")] : []
        },
        flags: InteractionResponseFlags.EPHEMERAL
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
      flags: InteractionResponseFlags.EPHEMERAL
    }
  });
}