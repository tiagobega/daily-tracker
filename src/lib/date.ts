// Date helpers working with local "wall-clock" days (YYYY-MM-DD strings),
// which is how occurrences are keyed (see plan-docs/04).

export function getLocalTimezone(): string {
	return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

// Today's date in the given timezone as YYYY-MM-DD (en-CA yields that format).
export function todayISO(timezone: string = getLocalTimezone()): string {
	return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(
		new Date(),
	);
}

// Shift a YYYY-MM-DD string by N days (UTC-noon anchor avoids DST edges).
export function addDaysISO(dateISO: string, days: number): string {
	const d = new Date(`${dateISO}T12:00:00Z`);
	d.setUTCDate(d.getUTCDate() + days);
	return d.toISOString().slice(0, 10);
}

// Human label for a day header, e.g. "sexta, 4 de julho".
export function formatDayLabel(
	dateISO: string,
	timezone: string = getLocalTimezone(),
): string {
	return new Intl.DateTimeFormat('pt-BR', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		timeZone: timezone,
	}).format(new Date(`${dateISO}T12:00:00Z`));
}
