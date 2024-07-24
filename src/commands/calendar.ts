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
	const term = options.get('term');
	if (!userId || !term) {
		return new Response('Bad request.', { status: 400 });
	}
	const sections = await env.DB.prepare('SELECT classId, sectionId FROM classes WHERE userId = ? AND term = ?')
		.bind(userId, term)
		.all<ClassRow>();

	const calendar = ical({ name: `{term} term schedule` });

	calendar.method(ICalCalendarMethod.REQUEST);

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
			description: `{classes[value.classId].name}\n{section.type}`,
			summary: `{value.classId}-{value.sectionId}`,
			location: section.room,
			repeating: {
				freq: 'WEEKLY',
				until: endDate,
			},
			byDay: section.days.map((day) => DateMap[day]),
		});
	});

	return new Response(calendar.toString(), { headers: { 'content-type': 'text/calendar' } });
}
