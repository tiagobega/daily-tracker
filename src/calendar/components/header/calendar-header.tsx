import { CalendarRange, Columns, Grid2x2, Grid3x3, List } from 'lucide-react';
import { DateNavigator } from '@/calendar/components/header/date-navigator';
import { TodayButton } from '@/calendar/components/header/today-button';

import { useCalendar } from '@/calendar/contexts/calendar-context';
import type { IEvent } from '@/calendar/interfaces';
import type { TCalendarView } from '@/calendar/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const VIEWS: { key: TCalendarView; label: string; icon: typeof List }[] = [
	{ key: 'day', label: 'Dia', icon: List },
	{ key: 'week', label: 'Semana', icon: Columns },
	{ key: 'month', label: 'Mes', icon: Grid2x2 },
	{ key: 'year', label: 'Ano', icon: Grid3x3 },
	{ key: 'agenda', label: 'Agenda', icon: CalendarRange },
];

export function CalendarHeader({
	view,
	events,
}: {
	view: TCalendarView;
	events: IEvent[];
}) {
	const { setView } = useCalendar();

	return (
		<div className="flex flex-col gap-4 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
			<div className="flex items-center gap-3">
				<TodayButton />
				<DateNavigator view={view} events={events} />
			</div>

			<div className="inline-flex">
				{VIEWS.map(({ key, label, icon: Icon }, i) => (
					<Button
						key={key}
						type="button"
						aria-label={label}
						size="icon"
						variant={view === key ? 'default' : 'outline'}
						onClick={() => setView(key)}
						className={cn(
							'[&_svg]:size-5',
							i === 0 && 'rounded-r-none',
							i > 0 && i < VIEWS.length - 1 && '-ml-px rounded-none',
							i === VIEWS.length - 1 && '-ml-px rounded-l-none',
						)}
					>
						<Icon strokeWidth={1.8} />
					</Button>
				))}
			</div>
		</div>
	);
}
