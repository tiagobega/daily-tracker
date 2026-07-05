import { isSameDay, parseISO } from 'date-fns';
import { useMemo } from 'react';
import { CalendarAgendaView } from '@/calendar/components/agenda-view/calendar-agenda-view';

import { DndProviderWrapper } from '@/calendar/components/dnd/dnd-provider';

import { CalendarHeader } from '@/calendar/components/header/calendar-header';
import { CalendarMonthView } from '@/calendar/components/month-view/calendar-month-view';
import { CalendarDayView } from '@/calendar/components/week-and-day-view/calendar-day-view';
import { CalendarWeekView } from '@/calendar/components/week-and-day-view/calendar-week-view';
import { CalendarYearView } from '@/calendar/components/year-view/calendar-year-view';
import { useCalendar } from '@/calendar/contexts/calendar-context';

export function ClientContainer() {
	const { view, selectedDate, selectedUserId, events } = useCalendar();

	const filteredEvents = useMemo(() => {
		return events.filter((event) => {
			const eventStartDate = parseISO(event.startDate);
			const eventEndDate = parseISO(event.endDate);

			if (view === 'year') {
				const yearStart = new Date(selectedDate.getFullYear(), 0, 1);
				const yearEnd = new Date(
					selectedDate.getFullYear(),
					11,
					31,
					23,
					59,
					59,
					999,
				);
				return (
					eventStartDate <= yearEnd &&
					eventEndDate >= yearStart &&
					(selectedUserId === 'all' || event.user.id === selectedUserId)
				);
			}

			if (view === 'month' || view === 'agenda') {
				const monthStart = new Date(
					selectedDate.getFullYear(),
					selectedDate.getMonth(),
					1,
				);
				const monthEnd = new Date(
					selectedDate.getFullYear(),
					selectedDate.getMonth() + 1,
					0,
					23,
					59,
					59,
					999,
				);
				return (
					eventStartDate <= monthEnd &&
					eventEndDate >= monthStart &&
					(selectedUserId === 'all' || event.user.id === selectedUserId)
				);
			}

			if (view === 'week') {
				const dayOfWeek = selectedDate.getDay();
				const weekStart = new Date(selectedDate);
				weekStart.setDate(selectedDate.getDate() - dayOfWeek);
				weekStart.setHours(0, 0, 0, 0);
				const weekEnd = new Date(weekStart);
				weekEnd.setDate(weekStart.getDate() + 6);
				weekEnd.setHours(23, 59, 59, 999);
				return (
					eventStartDate <= weekEnd &&
					eventEndDate >= weekStart &&
					(selectedUserId === 'all' || event.user.id === selectedUserId)
				);
			}

			if (view === 'day') {
				const dayStart = new Date(
					selectedDate.getFullYear(),
					selectedDate.getMonth(),
					selectedDate.getDate(),
					0,
					0,
					0,
				);
				const dayEnd = new Date(
					selectedDate.getFullYear(),
					selectedDate.getMonth(),
					selectedDate.getDate(),
					23,
					59,
					59,
				);
				return (
					eventStartDate <= dayEnd &&
					eventEndDate >= dayStart &&
					(selectedUserId === 'all' || event.user.id === selectedUserId)
				);
			}

			return false;
		});
	}, [selectedDate, selectedUserId, events, view]);

	const singleDayEvents = filteredEvents.filter((event) =>
		isSameDay(parseISO(event.startDate), parseISO(event.endDate)),
	);
	const multiDayEvents = filteredEvents.filter(
		(event) => !isSameDay(parseISO(event.startDate), parseISO(event.endDate)),
	);
	const eventStartDates = useMemo(
		() => filteredEvents.map((event) => ({ ...event, endDate: event.startDate })),
		[filteredEvents],
	);

	return (
		<div className="overflow-hidden rounded-xl border">
			<CalendarHeader view={view} events={filteredEvents} />

			<DndProviderWrapper>
				{view === 'day' && (
					<CalendarDayView
						singleDayEvents={singleDayEvents}
						multiDayEvents={multiDayEvents}
					/>
				)}
				{view === 'month' && (
					<CalendarMonthView
						singleDayEvents={singleDayEvents}
						multiDayEvents={multiDayEvents}
					/>
				)}
				{view === 'week' && (
					<CalendarWeekView
						singleDayEvents={singleDayEvents}
						multiDayEvents={multiDayEvents}
					/>
				)}
				{view === 'year' && <CalendarYearView allEvents={eventStartDates} />}
				{view === 'agenda' && (
					<CalendarAgendaView
						singleDayEvents={singleDayEvents}
						multiDayEvents={multiDayEvents}
					/>
				)}
			</DndProviderWrapper>
		</div>
	);
}
