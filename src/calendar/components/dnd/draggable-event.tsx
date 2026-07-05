import type { IEvent } from '@/calendar/interfaces';

export const ItemTypes = { EVENT: 'event' };

// Read-only stub: renders the event in place (no dragging).
export function DraggableEvent({
	children,
}: {
	event: IEvent;
	children: React.ReactNode;
}) {
	return <div>{children}</div>;
}
