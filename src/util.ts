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

// definitely very cryptographically secure
export function lazyEncrypt(input: string): string {
	return input.split("").map((char: string, i: number) => {
		return String.fromCharCode(char.charCodeAt(0) + 49 + i);
	}).join("");
}

export function lazyDecrypt(input: string): string {
	return input.split("").map((char: string, i: number) => {
		return String.fromCharCode(char.charCodeAt(0) - 49 - i);
	}).join("");
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
  constructor(body: string, init?: ResponseInit) {
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
    super(body, init);
  }
}