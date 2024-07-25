import { InteractionType, InteractionResponseType } from "discord-interactions";
import { JsonResponse, verifyDiscordRequest, parseOptions } from "./util";

import { generateScheduleResponse, scheduleCommand } from "./commands/schedule";
import { addClassCommand } from "./commands/addclass";
import { removeClassCommand } from "./commands/removeclass";
import { classCommand } from "./commands/class";
import { mutualsCommand } from "./commands/mutuals";
import { importCommand } from "./commands/import";
import { calendarCommand, generateCalendarResponse } from "./commands/calendar";
import { listCommand } from "./commands/list";

//import { migrateTermColumn } from "./migrateTermColumn";

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);
		if(url.pathname === "/schedule" || url.pathname === "/schedule.png"){
			return generateScheduleResponse(env, ctx, url.searchParams.get("userId"), url.searchParams.get("term"), url.searchParams.get("v"))
		}else if(url.pathname === "/calendar.ics"){
			return generateCalendarResponse(env, url.searchParams.get("userId"), url.searchParams.get("term"));
		}/*else if(url.pathname === "/migrate"){
			await migrateTermColumn(env);
			return new Response();
		}*/

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

		if(interaction.type === InteractionType.APPLICATION_COMMAND){
			const userId = interaction?.member?.user?.id || interaction?.user?.id;
			const options = (interaction.data.type === 1/* slash command */) ? parseOptions(interaction) : (new Map().set("user", interaction.data["target_id"]));

			switch (interaction.data.name.toLowerCase()) {
				case "schedule":
					return await scheduleCommand(env, userId, options);
				case "calendar":
					return await calendarCommand(env, userId, options);
				case "addclass":
					return await addClassCommand(env, userId, options);
				case "removeclass":
					return await removeClassCommand(env, userId, options);
				case "class":
					return await classCommand(env, userId, options);
				case "mutuals":
				case "mutual classes":
					return await mutualsCommand(env, userId, options);
				case "list":
				case "list classes":
					return await listCommand(env, userId, options);
				case "import":
					return await importCommand(env, userId, options);
				default:
					return new JsonResponse({ error: 'Unknown Type' }, { status: 400 });
			}
		}

		return new JsonResponse({ error: 'Unknown Type' }, { status: 400 });
	}
} satisfies ExportedHandler<Env>;