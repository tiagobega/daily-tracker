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

// --- month grid helpers (calendar) --------------------------------------

const pad = (n: number) => String(n).padStart(2, '0');

// First / last day of a month as YYYY-MM-DD (month is 1-12).
export function firstOfMonth(year: number, month: number): string {
	return `${year}-${pad(month)}-01`;
}
export function lastOfMonth(year: number, month: number): string {
	return `${year}-${pad(month)}-${pad(new Date(year, month, 0).getDate())}`;
}

// Cells for a month grid: leading nulls (to align the 1st under its weekday,
// week starting on Sunday) followed by each day's YYYY-MM-DD.
export function monthGridCells(year: number, month: number): (string | null)[] {
	const firstWeekday = new Date(year, month - 1, 1).getDay(); // 0=Sun
	const days = new Date(year, month, 0).getDate();
	const cells: (string | null)[] = Array(firstWeekday).fill(null);
	for (let d = 1; d <= days; d++) cells.push(`${year}-${pad(month)}-${pad(d)}`);
	return cells;
}

export function formatMonthLabel(year: number, month: number): string {
	return new Intl.DateTimeFormat('pt-BR', {
		month: 'long',
		year: 'numeric',
	}).format(new Date(year, month - 1, 1));
}

export function dayOfMonth(iso: string): number {
	return Number(iso.slice(8, 10));
}

// Convert a local Date (from a calendar picker) to a YYYY-MM-DD string.
export function dateToISODate(d: Date): string {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

// Parse a YYYY-MM-DD string into a local Date (midnight).
export function isoToLocalDate(iso: string): Date {
	const [y, m, d] = iso.split('-').map(Number);
	return new Date(y, m - 1, d);
}

// Short pt-BR date, e.g. "04/07/2026".
export function formatShortDate(iso: string): string {
	return new Intl.DateTimeFormat('pt-BR').format(isoToLocalDate(iso));
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
