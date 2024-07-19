import { verifyKey } from "discord-interactions";
import { classes } from "./db";

export type ClassRow = {
	RowID: number,
	userId: string,
  classId: string,
	sectionId: string
}

export async function verifyDiscordRequest(request: Request, env: Env): Promise<{
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

export function parseOptions(options: {
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

export function organizeClassList(sections: ClassRow[]): string[] {
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

export function getClassString(classId: string, sectionId?: string): string {
	classId = classId.toUpperCase();
	sectionId = sectionId?.toUpperCase();
	if(!classes[classId]){
		return "Unknown class (" + classId + "-" + sectionId + ")";
	}
	return sectionId ? classes[classId].name + " (" + classId + "-" + sectionId + ")" : classes[classId].name + " (" + classId + ")";
}

export class JsonResponse extends Response {
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

export class HtmlResponse extends Response {
  constructor(env: Env, body: string, init?: ResponseInit) {
    if(!init){
			init = {}
		}
		if(!init.headers){
			init.headers = {};
		}
		if(!('content-type' in init.headers)){
			// @ts-ignore
			init.headers['content-type'] = "text/html;charset=UTF-8"
		}
    super(`
			<!DOCTYPE html>
			<html>
				<head>
					<meta charset="utf-8">
					<meta http-equiv="X-UA-Compatible" content="IE=edge">
					<meta name="viewport" content="width=device-width, initial-scale=1">
					<title>${env.BOT_NAME}</title>
					<meta name="description" content="Import your course list from Workday into ${env.BOT_NAME}">
					<meta name="theme-color" content="${env.BOT_THEME_COLOR}">
				</head>
				<style>
					html {
						--theme-color: ${env.BOT_THEME_COLOR};
						border-top: solid 15px var(--theme-color);
					}

					body {
						font-family: sans-serif;
					}

					h1 {
						color: var(--theme-color);
					}

					body {
						margin: 10vh 10%;
						text-align: center;
					}

					input[type="submit"], input::file-selector-button {
						background-color: var(--theme-color);
						color: white;
						border: none;
						padding: 10px;
						cursor: pointer;
					}

					input[type="submit"]:hover, input::file-selector-button:hover {
						opacity: 0.5;
					}
				</style>
				<body>
					<h1>${env.BOT_NAME}</h1>
					${body}
				</body>
			</html>
		`, init);
  }
}