import type { ICalendarCell } from '@/calendar/interfaces';

// Read-only stub: no drop target.
export function DroppableDayCell({
	children,
}: {
	cell: ICalendarCell;
	children: React.ReactNode;
}) {
	return <div>{children}</div>;
}
