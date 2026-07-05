import { createFileRoute } from '@tanstack/react-router';
import { RichCalendar } from '#/features/calendar/rich-calendar';

export const Route = createFileRoute('/_app/calendar')({
	component: CalendarPage,
});

function CalendarPage() {
	return (
		<main className="flex flex-1 flex-col p-3 pb-24">
			<RichCalendar />
		</main>
	);
}
