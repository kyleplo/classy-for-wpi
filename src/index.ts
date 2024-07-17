import { verifyKey, InteractionType, InteractionResponseType, InteractionResponseFlags } from "discord-interactions";
import { classes } from "./db";

declare interface Env {
	DB: D1Database,
	DISCORD_PUBLIC_KEY: string,
	DISCORD_APPLICATION_ID: string,
	DISCORD_TOKEN: string
}

class JsonResponse extends Response {
  constructor(body: object, init?: ResponseInit) {
    const jsonBody = JSON.stringify(body);
    if(!init){
			init = {}
		}
		if(!init.headers){
			init.headers = {};
		}
		if(!('content-type' in init.headers)){
			// @ts-ignore
			init.headers['content-type'] = "application/json;charset=UTF-8"
		}
    super(jsonBody, init);
  }
}

async function verifyDiscordRequest(request: Request, env: Env): Promise<{
	isValid: boolean,
	interaction?: any
}> {
  const signature = request.headers.get('x-signature-ed25519');
  const timestamp = request.headers.get('x-signature-timestamp');
  const body = await request.text();
  const isValidRequest =
    signature &&
    timestamp &&
    (await verifyKey(body, signature, timestamp, env.DISCORD_PUBLIC_KEY));
  if (!isValidRequest) {
    return { isValid: false };
  }

  return { interaction: JSON.parse(body), isValid: true };
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const { isValid, interaction } = await verifyDiscordRequest(
			request,
			env,
		);
		if (!isValid || !interaction) {
			return new Response('Bad request signature.', { status: 401 });
		}

		if (interaction.type === InteractionType.PING) {
			return new JsonResponse({
				type: InteractionResponseType.PONG,
			});
		}

		if(interaction.type === InteractionType.APPLICATION_COMMAND || interaction.type === 2 /* user context menu */){
			const userId = interaction?.member?.user?.id || interaction?.user?.id;
			const options = interaction.data.options ? parseOptions(interaction.data.options) : new Map().set("user", interaction.data["target_id"]);

			switch (interaction.data.name.toLowerCase()) {
				case "schedule":
					const sections = await env.DB.prepare("SELECT classId, sectionId FROM classes WHERE userId = ?").bind(options.get("user") || userId).all();

					const classList = organizeClassList(sections.results as any);

					if(classList.length === 0){
						return new JsonResponse({
							type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
							data: {
								content: (options.has("user") ? "<@" + options.get("user") + "> is" : "You are") + " not registered for any classes.",
								allowed_mentions: {
									users: options.has("user") ? [options.get("user")] : []
								},
								flags: 4096
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
							flags: 4096
						}
					});
				case "addclass":
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
							if(!classes[options.get("class") as string].sections.includes(options.get("section" + i) as string)){
								return new JsonResponse({
									type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
									data: {
										content: "Unknown section " + options.get("section" + i),
										flags: InteractionResponseFlags.EPHEMERAL
									}
								});
							}

							batch.push(env.DB.prepare("INSERT INTO classes (userId, classId, sectionId)\nVALUES (?, ?, ?)").bind(userId, options.get("class"), options.get("section" + i)))
						}
					}

					await env.DB.batch(batch);

					return new JsonResponse({
						type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
						data: {
							content: "Successfully added to " + getClassString(options.get("class") as string),
							flags: InteractionResponseFlags.EPHEMERAL
						}
					});
				case "removeclass":
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
				case "class":
					var users;
					if(options.has("section")){
						users = await env.DB.prepare("SELECT userId FROM classes WHERE classId = ? AND sectionId = ?").bind(options.get("class"), options.get("section")).all();
					}else{
						users = await env.DB.prepare("SELECT userId, sectionId FROM classes WHERE classId = ?").bind(options.get("class")).all();
					}

					if(users.results.length === 0){
						return new JsonResponse({
							type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
							data: {
								content: "Nobody is currently registered for " + getClassString(options.get("class") as string, options.get("section"))
							}
						});
					}

					const userIds: {[userId: string]: string[]} = {};
					users.results.forEach(user => {
						if(userIds[user.userId as string]){
							userIds[user.userId as string].push(user.sectionId as string);
						}else{
							userIds[user.userId as string] = [user.sectionId as string];
						}
					});

					return new JsonResponse({
						type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
						data: {
							content: (Object.keys(userIds).length > 1 ? Object.keys(userIds).length + "people are" : "1 person is") + " registered for " + getClassString(options.get("class") as string, options.get("section")) + ":" + Object.entries(userIds).map(value => "\n- <@" + value[0] + ">" + (options.get("section") ? "" : " (" + value[1].map(sectionId => options.get("class") + "-" + sectionId).join(", ") + ")")).join(""),
							allowed_mentions: {
								users: Object.keys(userIds)
							},
							flags: 4096
						}
					});
				case "mutuals":
				case "Mutual Classes":
					const getUserSections = env.DB.prepare("SELECT classId, sectionId FROM classes WHERE userId = ?")
					const allSections = await env.DB.batch([
						getUserSections.bind(userId),
						getUserSections.bind(options.get("user"))
					]);

					const mySections = allSections[0].results;
					const otherSections = allSections[1].results;

					const commonSections = mySections.filter((section: any) => {
						return otherSections.find((otherSection: any) => section.classId === otherSection.classId && section.sectionId === otherSection.sectionId)
					})
					const commonClassList = organizeClassList(commonSections as any);

					if(commonClassList.length === 0){
						return new JsonResponse({
							type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
							data: {
								content: "You do not have any classes in common with <@" + options.get("user") + ">",
								allowed_mentions: {
									users: [options.get("user")]
								},
								flags: 4096
							}
						});
					}
				
					return new JsonResponse({
						type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
						data: {
							content: "You have " + (commonClassList.length === 1 ? "1 class" : commonClassList.length + " classes") + " in common with <@" + options.get("user") + ">:\n- " + commonClassList.join("\n- "),
							allowed_mentions: {
								users: [options.get("user")]
							},
							flags: 4096
						}
					});
				default:
					return new JsonResponse({ error: 'Unknown Type' }, { status: 400 });
			}
		}

		return new JsonResponse({ error: 'Unknown Type' }, { status: 400 });
	}
} satisfies ExportedHandler<Env>;

function parseOptions(options: {
	name: string,
	value: string
}[] = []): Map<string, string>{
	const optionMap = new Map<string, string>();
	options.forEach(option => {
		var value = option.value;
		if(option.name === "class" || option.name.startsWith("section")){
			value = value.toUpperCase();
		}
		if(option.name === "class"){
			value = value.replace(" ", "");
		}
		optionMap.set(option.name, value);
	});
	return optionMap;
}

function organizeClassList(sections: {
	classId: string,
	sectionId: string
}[]): string[] {
	const classMap: {[classId: string]: string[]} = {};
	sections.forEach(section => {
		if(classMap[section.classId]){
			classMap[section.classId].push(section.sectionId);
		}else{
			classMap[section.classId] = [section.sectionId]
		}
	});
	return Object.entries(classMap).map(value => {
		return (classes[value[0]]?.name || "Unknown class") + " (" + value[1].map(section => value[0] + "-" + section).join(", ") + ")";
	});
}

function getClassString(classId: string, sectionId?: string): string {
	classId = classId.toUpperCase();
	sectionId = sectionId?.toUpperCase();
	if(!classes[classId]){
		return "Unknown class (" + classId + "-" + sectionId + ")";
	}
	return sectionId ? classes[classId].name + " (" + classId + "-" + sectionId + ")" : classes[classId].name + " (" + classId + ")";
}