import { InteractionResponseType } from 'discord-interactions';
import { ClassRow, Writer, JsonResponse } from '../util';
import { classes } from '../db';

import ical, { ICalCalendarMethod } from 'ical-generator';

const DateMap = ['MO', 'TU', 'WE', 'TH', 'FR'];

const TermStartEnd = {
	A: [new Date(2024, 7, 22), new Date(2024, 9, 12)],
	B: [new Date(2024, 9, 21), new Date(2024, 11, 14)],
	C: [new Date(2025, 0, 15), new Date(2025, 2, 8)],
	D: [new Date(2025, 2, 17), new Date(2025, 4, 8)],
};

export async function calendarCommand(env: Env, userId: string, options: Map<string, string>): Promise<Response> {
	return new JsonResponse({
		type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
		data: {
			embeds: [
				{
					title: `${options.has('userName') ? options.get('userName') + "'s c" : 'C'}alendar for ${options.get('term')} term`,
					image: {
						url: `${env.BOT_LINK}/calendar?userId=${options.get('user') || userId}&term=${options.get('term')}&v=${Date.now()}`,
					},
				},
			],
		},
	});
}

export async function generateCalendarResponse(env: Env, userId: string | null, termSelection: string | null, version: string | null) {
	if (!userId || !termSelection) {
		return new Response('Bad request.', { status: 400 });
	}

	const cachedCalendar = await caches.default.match(`${env.BOT_LINK}/calendar?userId=${userId}&term=${term}&v=${version}`);
	if (cachedCalendar) {
		return cachedCalendar;
	}

	let terms = []
    if (termSelection == "ALL"){
        terms = ["A", "B", "C", "D"]
    } else {
        terms = [termSelection]
    }
	const calendar = ical({ name: `{term} term schedule` });

	calendar.method(ICalCalendarMethod.REQUEST);
	terms.forEach(term => {
	    const sections = await env.DB.prepare('SELECT classId, sectionId FROM classes WHERE userId = ? AND term = ?')
		    .bind(userId, term)
		    .all<ClassRow>();


	    sections.forEach((value) => {
		    const section = classes[value.classId].sections[value.sectionId];

		    const [startDate, endDate] = TermStartEnd[term];

		    let startTime = startDate;
		    let endTime = startDate;
		    startTime.setHours(Math.floor(section.starts / 100), section.starts % 100);
		    endTime.setHours(Math.floor(section.ends / 100), section.starts % 100);
		    calendar.createEvent({
			    start: startTime,
			    end: endTime,
			    description: `${classes[value.classId].name}\n${section.type}`,
			    summary: `${value.classId}-${value.sectionId}`,
			    location: section.room,
			    repeating: {
				    freq: 'WEEKLY',
				    until: endDate,
			    },
			    byDay: section.days.map((day) => DateMap[day]),
		    });
	    });
	});

	const scheduleCalendar = new Response(calendar.toString(), {
		headers: {
			'content-type': 'text/calendar',
			'cache-control': 'public, max-age=86400, immutable',
		},
	});

	if (version) {
		caches.default.put(`${env.BOT_LINK}/calendar?userId=${userId}&term=${term}&v=${version}`, scheduleCalendar.clone());
	}

	scheduleCalendar.headers.append('last-modified', new Date().toUTCString());
	return scheduleCalendar;
}
