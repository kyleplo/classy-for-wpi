import { InteractionResponseFlags, InteractionResponseType } from "discord-interactions";
import { ClassRow, displayTerm, JsonResponse, organizeClassList } from "../util";
import { terms } from "../db";

export async function mutualsCommand(env: Env, userId: string, options: Map<string, string>): Promise<Response> {
  var allSections;
  if(!options.has("term")){
    const getUserSections = env.DB.prepare("SELECT classId, sectionId FROM classes WHERE userId = ?");
    allSections = await env.DB.batch<ClassRow>([
      getUserSections.bind(userId),
      getUserSections.bind(options.get("user"))
    ]);
  }else{
    const getUserSections = env.DB.prepare("SELECT classId, sectionId FROM classes WHERE userId = ? AND (term = ? OR term = ?)");
    allSections = await env.DB.batch<ClassRow>([
      getUserSections.bind(userId, options.get("term"), terms[options.get("term") as string].partOf),
      getUserSections.bind(options.get("user"), options.get("term"), terms[options.get("term") as string].partOf)
    ]);
  }

  const mySections = allSections[0].results;
  const otherSections = allSections[1].results;

  const commonSections = mySections.filter((section: ClassRow) => {
    return otherSections.find((otherSection: any) => section.classId === otherSection.classId && section.sectionId === otherSection.sectionId);
  });
  const commonClassList = organizeClassList(commonSections);

  if (commonClassList.length === 0) {
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: "You do not have any classes in common with <@" + options.get("user") + ">" + (options.has("term") ? " during " + displayTerm(options.get("term") as string) : "") + ".",
        allowed_mentions: {
          users: [options.get("user")]
        },
        flags: InteractionResponseFlags.EPHEMERAL
      }
    });
  }

  return new JsonResponse({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: "You have " + (commonClassList.length === 1 ? "1 class" : commonClassList.length + " classes") + " in common with <@" + options.get("user") + ">" + (options.has("term") ? " during " + displayTerm(options.get("term") as string) : "") + ":\n- " + commonClassList.join("\n- "),
      allowed_mentions: {
        users: [options.get("user")]
      },
      flags: InteractionResponseFlags.EPHEMERAL
    }
  });
}