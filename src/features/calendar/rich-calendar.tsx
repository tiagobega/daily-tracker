import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ClientContainer } from '#/calendar/components/client-container';
import { CalendarProvider } from '#/calendar/contexts/calendar-context';
import type { IEvent } from '#/calendar/interfaces';
import type { TCalendarView, TEventColor } from '#/calendar/types';
import { rangeTasksQueryOptions } from '#/features/tasks/queries';
import type { Occurrence } from '#/features/tasks/recurrence';
import { addDaysISO, firstOfMonth, lastOfMonth } from '#/lib/date';

// Feeds the ported big-calendar (read-only) with our recurrence occurrences.
const PRIORITY_COLOR: Record<string, TEventColor> = {
	high: 'red',
	medium: 'blue',
	low: 'green',
};
const CALENDAR_USER = { id: 'me', name: 'Você', picturePath: null };
const DEFAULT_DURATION_MIN = 30;

const pad = (n: number) => String(n).padStart(2, '0');
function toLocalISO(d: Date): string {
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
		d.getHours(),
	)}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function occurrenceToEvent(o: Occurrence): IEvent {
	const time = o.timeOfDay?.slice(0, 5) ?? '00:00';
	const start = new Date(`${o.occurrenceDate}T${time}:00`);
	const end = new Date(start.getTime() + DEFAULT_DURATION_MIN * 60_000);
	return {
		id: `${o.taskId}:${o.occurrenceDate}`,
		title: o.title,
		description: o.description ?? '',
		startDate: toLocalISO(start),
		endDate: toLocalISO(end),
		color: PRIORITY_COLOR[o.priority] ?? 'blue',
		user: CALENDAR_USER,
	};
}

export function RichCalendar() {
	const [view, setView] = useState<TCalendarView>('month');
	const [selectedDate, setSelectedDate] = useState(() => new Date());

	const y = selectedDate.getFullYear();
	const m = selectedDate.getMonth() + 1;
	// Fetch a padded month window (or the whole year for the year view).
	const from =
		view === 'year' ? `${y}-01-01` : addDaysISO(firstOfMonth(y, m), -7);
	const to = view === 'year' ? `${y}-12-31` : addDaysISO(lastOfMonth(y, m), 7);

	const query = useQuery(rangeTasksQueryOptions(from, to));
	const events = (query.data ?? [])
		.filter((o) => !o.isCancelled)
		.map(occurrenceToEvent);

	return (
		<CalendarProvider
			events={events}
			view={view}
			onViewChange={setView}
			selectedDate={selectedDate}
			onSelectedDateChange={setSelectedDate}
		>
			<ClientContainer />
		</CalendarProvider>
	);
}
