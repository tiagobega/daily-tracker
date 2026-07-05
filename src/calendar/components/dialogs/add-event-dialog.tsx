// Read-only stub: no add-event dialog. Renders children (clickable cells) as-is.
export function AddEventDialog({
	children,
}: {
	children?: React.ReactNode;
	startDate?: Date;
	startTime?: { hour: number; minute: number };
}) {
	return <>{children ?? null}</>;
}
