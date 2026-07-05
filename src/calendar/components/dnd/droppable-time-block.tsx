// Read-only stub: no drop target.
export function DroppableTimeBlock({
	children,
}: {
	date: Date;
	hour: number;
	minute: number;
	children: React.ReactNode;
}) {
	return <div className="h-[24px]">{children}</div>;
}
