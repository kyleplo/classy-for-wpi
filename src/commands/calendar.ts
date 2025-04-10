import { InteractionResponseType, InteractionResponseFlags } from 'discord-interactions';
import { academicYearFromTerm, ClassRow, displayTerm, getClassString, JsonResponse } from '../util';
import { classes, terms } from '../db';

import ical, { ICalEventRepeatingFreq, ICalWeekday } from 'ical-generator';

const weekdays = [ICalWeekday.MO, ICalWeekday.TU, ICalWeekday.WE, ICalWeekday.TH, ICalWeekday.FR];

export async function calendarCommand(env: Env, userId: string, options: Map<string, string>): Promise<Response> {
	return new JsonResponse({
		type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
		data: {
			content: `Your schedule has been converted to calendar format. Use [this link](${env.BOT_LINK}/calendar.ics?userId=${options.get('user') || userId}${options.has("term") ? "&term=" + options.get('term') : ""}) to download it.`,
			flags: InteractionResponseFlags.EPHEMERAL
		},
	});
}

export async function generateCalendarResponse(env: Env, userId: string | null, termSelection: string | null) {
	if (!userId || (termSelection && !terms[termSelection])) {
		return new Response('Bad request.', { status: 400 });
	}

	const sections = await env.DB.prepare('SELECT classId, sectionId, term FROM classes WHERE userId = ?').bind(userId).all<ClassRow>();

	let includeTerms = [];
	if (!termSelection) {
		includeTerms = ["A", "B", "C", "D", "E1", "E2", "Spring", "Fall", "Summer"];
	} else {
		includeTerms = [termSelection];
		if (terms[termSelection].partOf !== "none") {
			includeTerms.push(terms[termSelection].partOf);
		}
	}

	const calendar = ical({
		name: `${env.SCHOOL_NAME} ${termSelection ? `${displayTerm(termSelection)} ` : ``}Schedule`,
		timezone: "America/New_York",
		prodId: "-//kyleplo.com//classy//EN"
	});

	sections.results.forEach(value => {
		const section = classes[value.classId].years[academicYearFromTerm(value.term)][value.sectionId];

		if(!section.starts || !section.ends || !section.room || !section.term){
			return;
		}

		if(!includeTerms.find(term => (section.term as string).startsWith(term))){
			return;
		}

		let startTime = new Date(terms[section.term].starts);
		let endTime = new Date(terms[section.term].starts);
		while(!section.days.includes(startTime.getDay() - 1)){
			startTime.setDate(startTime.getDate() + 1);
			endTime.setDate(endTime.getDate() + 1);
		}
		
		startTime.setHours(Math.floor(section.starts / 60), section.starts % 60);
		endTime.setHours(Math.floor(section.ends / 60), section.ends % 60);
		calendar.createEvent({
			start: startTime,
			end: endTime,
			description: getClassString(value.classId, value.sectionId) + (section.instructors.length ? " with " + section.instructors.join(", ") : ""),
			summary: `${value.classId} ${section.type}`,
			location: section.room,
			repeating: {
				freq: ICalEventRepeatingFreq.WEEKLY,
				byDay: section.days.map((day) => weekdays[day]),
				until: new Date(terms[section.term].ends),
			}
		});
	});

	return new Response(calendar.toString(), {
		headers: {
			'content-type': 'text/calendar',
			'content-disposition': 'attachment; filename=calendar.ics'
		},
	});
}
