import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Button } from '#/components/ui/button';
import { Skeleton } from '#/components/ui/skeleton';
import { rangeTasksQueryOptions } from '#/features/tasks/queries';
import {
	dayOfMonth,
	firstOfMonth,
	formatMonthLabel,
	lastOfMonth,
	monthGridCells,
	todayISO,
} from '#/lib/date';
import { cn } from '#/lib/utils';

export const Route = createFileRoute('/_app/calendar')({
	component: CalendarPage,
});

const WEEKDAYS = [
	['dom', 'D'],
	['seg', 'S'],
	['ter', 'T'],
	['qua', 'Q'],
	['qui', 'Q'],
	['sex', 'S'],
	['sab', 'S'],
] as const;

type DaySummary = { total: number; done: number };

function CalendarPage() {
	const today = todayISO();
	const [{ year, month }, setMonth] = useState(() => {
		const now = new Date();
		return { year: now.getFullYear(), month: now.getMonth() + 1 };
	});

	const from = firstOfMonth(year, month);
	const to = lastOfMonth(year, month);
	const query = useQuery(rangeTasksQueryOptions(from, to));

	// Per-day summary of active occurrences (cancelled excluded).
	const summary = new Map<string, DaySummary>();
	for (const occ of query.data ?? []) {
		if (occ.isCancelled) continue;
		const s = summary.get(occ.occurrenceDate) ?? { total: 0, done: 0 };
		s.total += 1;
		if (occ.status === 'done') s.done += 1;
		summary.set(occ.occurrenceDate, s);
	}

	function shiftMonth(delta: number) {
		setMonth(({ year: y, month: m }) => {
			const d = new Date(y, m - 1 + delta, 1);
			return { year: d.getFullYear(), month: d.getMonth() + 1 };
		});
	}

	return (
		<main className="flex flex-1 flex-col gap-4 p-4 pb-24">
			<header className="flex items-center justify-between gap-2">
				<Button
					variant="outline"
					size="icon"
					onClick={() => shiftMonth(-1)}
					aria-label="Mês anterior"
				>
					<ChevronLeft className="size-4" />
				</Button>
				<h1 className="font-bold text-lg capitalize">
					{formatMonthLabel(year, month)}
				</h1>
				<Button
					variant="outline"
					size="icon"
					onClick={() => shiftMonth(1)}
					aria-label="Próximo mês"
				>
					<ChevronRight className="size-4" />
				</Button>
			</header>

			<div className="grid grid-cols-7 gap-1 text-center text-muted-foreground text-xs">
				{WEEKDAYS.map(([key, label]) => (
					<span key={key}>{label}</span>
				))}
			</div>

			{query.isLoading ? (
				<Skeleton className="h-72 w-full rounded-lg" />
			) : (
				<div className="grid grid-cols-7 gap-1">
					{monthGridCells(year, month).map((iso, i) => {
						// biome-ignore lint/suspicious/noArrayIndexKey: leading blanks are positional
						if (!iso) return <span key={`blank-${i}`} />;
						const s = summary.get(iso);
						const allDone = s && s.done === s.total;
						const isToday = iso === today;
						return (
							<Link
								key={iso}
								to="/today"
								search={{ date: iso }}
								className={cn(
									'flex aspect-square flex-col items-center justify-center gap-1 rounded-md text-sm hover:bg-accent',
									isToday && 'ring-1 ring-primary',
								)}
							>
								<span className={cn(isToday && 'font-semibold')}>
									{dayOfMonth(iso)}
								</span>
								<span
									className={cn(
										'size-1.5 rounded-full',
										!s && 'bg-transparent',
										s && !allDone && 'bg-amber-500',
										s && allDone && 'bg-emerald-500',
									)}
								/>
							</Link>
						);
					})}
				</div>
			)}

			<div className="flex items-center gap-4 text-muted-foreground text-xs">
				<span className="flex items-center gap-1.5">
					<span className="size-1.5 rounded-full bg-amber-500" /> pendente
				</span>
				<span className="flex items-center gap-1.5">
					<span className="size-1.5 rounded-full bg-emerald-500" /> tudo feito
				</span>
			</div>
		</main>
	);
}
