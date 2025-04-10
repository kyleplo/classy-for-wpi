import { verifyKey } from "discord-interactions";
import { classes, terms } from "./db";

export type ClassRow = {
	RowID: number,
	userId: string,
  classId: string,
	sectionId: string,
	term: string,
	dorm: string | undefined,
	room: string | undefined
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

export function parseOptions(interaction: any): Map<string, string>{
	const optionMap = new Map<string, string>();
	if(!interaction?.data?.options){
		return optionMap;
	}
	interaction.data.options.forEach((option: {name: string, value: string}) => {
		var value = option.value;
		if(option.name === "class" || option.name.startsWith("section")){
			value = value.toUpperCase();
		}
		if(option.name === "class"){
			value = value.replace(" ", "");
		}
		if(option.name === "file"){
			value = interaction?.data?.resolved?.attachments[value];
		}
		if(option.name === "user"){
			if(interaction?.data?.resolved?.users && interaction?.data?.resolved?.users[value]){
				optionMap.set("userName", interaction?.data?.resolved?.users[value]?.global_name || interaction?.data?.resolved?.users[value]?.username)
			}
			if(interaction?.data?.resolved?.members && interaction?.data?.resolved?.members[value] && interaction?.data?.resolved?.members[value]?.nick){
				optionMap.set("userName", interaction?.data?.resolved?.members[value]?.nick)
			}
		}
		optionMap.set(option.name, value);
	});
	return optionMap;
}

export function organizeClassList(sections: ClassRow[]): string[] {
	const classMap: {[classId: string]: string[]} = {};
	sections.forEach(section => {
		if(classMap[section.classId]){
			if(!classMap[section.classId].includes(section.sectionId)){
				classMap[section.classId].push(section.sectionId);
			}
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

export function parseClassCode(code: string, year: string) {
	const parsed = /([A-Z]{2,} ?[0-9]{3,}X?)-([A-Z][A-Za-z-0-9]*)/g.exec(code.toUpperCase());
	if(!parsed || parsed.length !== 3){
		return;
	}
	const course = {
		course: parsed[1].replace(" ", ""),
		section: parsed[2]
	};
	if(!classes[course.course] || !classes[course.course].years[year][course.section]) {
		return;
	}
	return course;
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

// adapted from https://github.com/peernohell/worker-imageholder/
export class Writer extends EventTarget {
	writer: WritableStream;
	defaultWriter: WritableStreamDefaultWriter

  constructor(writer: WritableStream) {
    super();
    this.writer = writer;
		this.defaultWriter = writer.getWriter();
  }

  emit(event: string, data: any) {
    this.dispatchEvent(new Event(event));

    // TODO only on pipe
    if (event === 'pipe') {
      data.on('data', this.onData.bind(this));
      data.on('end', this.onEnd.bind(this));
    }
  }

  async onData(chunk: any) {
		await this.defaultWriter.ready;
    this.defaultWriter.write(chunk);
  }
  async onEnd() {
    this.emit('finish', null);
		await this.defaultWriter.ready;
		await this.defaultWriter.close();
  }
  end() { /* needed but writer.close must be called later. */ }
  on(evt: string, cb: EventListenerOrEventListenerObject) { this.addEventListener(evt, cb); return this; }
  removeListener(evt: string, cb: EventListenerOrEventListenerObject) { this.removeEventListener(evt, cb); }
}

export function currentTerm(): string {
	var currentTerm = "none";
	var currentTermEnd = Infinity;
	for (const [termName, term] of Object.entries(terms)) {
		if (term.ends > Date.now() && term.ends < currentTermEnd && term.partOf !== "none" && !termName.startsWith("Graduate")) {
			currentTerm = termName;
			currentTermEnd = term.ends;
		}
	}
	return currentTerm;
}

export function currentAcademicYear(): number {
	return new Date(terms[currentTerm()].starts).getFullYear();
}

export function academicYearFromTerm(term: string): number {
	var year = parseInt(term.slice(term.length - 4));
	if (isNaN(year)) {
		return 2024;
	}
	if (!(term.startsWith("A") || term.startsWith("B") || term.startsWith("Fall"))) {
		year--;
	}
	return year;
}

export function displayTerm(term: string): string {
	if (term.length < 4 || isNaN(parseInt(term[term.length - 4]))) {
		switch (term) {
			case "A":
				return "A term 2024";
			case "B":
				return "B term 2024";
			case "Fall":
				return "Fall term 2024";
			default:
				return term + " term 2025";
		}
	}

	return term.slice(0, term.length - 4) + " term " + term.slice(term.length - 4);
}