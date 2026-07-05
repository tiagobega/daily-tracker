import type { IEvent } from '@/calendar/interfaces';

// Read-only stub: no details dialog. Renders the trigger content in place.
export function EventDetailsDialog({
	children,
}: {
	event: IEvent;
	children: React.ReactNode;
}) {
	return <>{children}</>;
}
