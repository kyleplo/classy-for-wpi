import { InteractionResponseType, InteractionResponseFlags } from 'discord-interactions';
import { ClassRow, getClassString, JsonResponse } from '../util';
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
		includeTerms = ["A", "B", "C", "D", "E1", "E2"];
	} else {
		includeTerms = [termSelection];
	}

	const calendar = ical({
		name: `${env.SCHOOL_NAME} ${termSelection ? `${termSelection} term ` : ``}Schedule`,
		timezone: "America/New_York",
		prodId: "-//kyleplo.com//classy//EN"
	});

	sections.results.forEach(value => {
		const section = classes[value.classId].sections[value.sectionId];

		if(!section.starts || !section.ends || !section.room || !section.term){
			return;
		}

		if(!includeTerms.includes(section.term) && !includeTerms.includes(terms[section.term].partOf)){
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
			description: getClassString(value.classId, value.sectionId),
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
