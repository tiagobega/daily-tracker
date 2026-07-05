import type { Weekday } from 'rrule';
import * as rrulePkg from 'rrule';
import type {
	RecurrenceRule,
	Weekday as RuleWeekday,
} from '#/lib/recurrence-rule';

// `rrule` is a CommonJS module. Under Vite's SSR module runner its exports sit
// on the namespace's `.default`; the Rollup build exposes them on the namespace
// directly. Handle both so dev SSR and production agree.
const rruleExports =
	(rrulePkg as unknown as { default?: typeof rrulePkg }).default ?? rrulePkg;
const { RRule } = rruleExports;

export type CompletionStatus = 'done' | 'skipped' | 'partial' | null;

// Pure recurrence engine (plan-docs/04). No DB / React dependencies, so it is
// trivially unit-testable. Occurrences are computed on the fly; the future is
// never persisted. Dates are "wall-clock" YYYY-MM-DD strings; rrule runs in UTC
// to avoid DST drift.

export type EngineTask = {
	id: string;
	title: string;
	description: string | null;
	categoryId: string | null;
	priority: string;
	startsOn: string; // YYYY-MM-DD
	timeOfDay: string | null;
	isRecurring: boolean;
	recurrenceRule: RecurrenceRule | null;
};

export type EngineOverride = {
	taskId: string;
	occurrenceDate: string;
	title: string | null;
	description: string | null;
	timeOfDay: string | null;
	categoryId: string | null;
	isCancelled: boolean;
};

export type EngineCompletion = {
	taskId: string;
	occurrenceDate: string;
	status: Exclude<CompletionStatus, null>;
};

export type Occurrence = {
	taskId: string;
	occurrenceDate: string;
	title: string;
	description: string | null;
	timeOfDay: string | null;
	categoryId: string | null;
	priority: string;
	isRecurring: boolean;
	recurrenceRule: RecurrenceRule | null;
	isOverride: boolean;
	status: CompletionStatus;
};

const FREQ = {
	daily: RRule.DAILY,
	weekly: RRule.WEEKLY,
	monthly: RRule.MONTHLY,
	yearly: RRule.YEARLY,
} as const;

const WEEKDAY: Record<RuleWeekday, Weekday> = {
	MO: RRule.MO,
	TU: RRule.TU,
	WE: RRule.WE,
	TH: RRule.TH,
	FR: RRule.FR,
	SA: RRule.SA,
	SU: RRule.SU,
};

function utcDate(iso: string, endOfDay = false): Date {
	return new Date(`${iso}T${endOfDay ? '23:59:59' : '00:00:00'}Z`);
}

function toISODate(d: Date): string {
	return d.toISOString().slice(0, 10);
}

function key(taskId: string, date: string): string {
	return `${taskId}|${date}`;
}

export function buildRRule(rule: RecurrenceRule, startsOn: string) {
	return new RRule({
		freq: FREQ[rule.freq],
		interval: rule.interval ?? 1,
		dtstart: utcDate(startsOn),
		until: rule.until ? utcDate(rule.until, true) : undefined,
		byweekday: rule.byweekday?.map((d) => WEEKDAY[d]),
		bymonthday: rule.bymonthday,
	});
}

// The occurrence dates of a single task within [from, to] (inclusive).
function occurrenceDates(task: EngineTask, from: string, to: string): string[] {
	if (!task.isRecurring || !task.recurrenceRule) {
		return task.startsOn >= from && task.startsOn <= to ? [task.startsOn] : [];
	}
	const rrule = buildRRule(task.recurrenceRule, task.startsOn);
	return rrule.between(utcDate(from), utcDate(to, true), true).map(toISODate);
}

export type ExpandInput = {
	tasks: EngineTask[];
	overrides: EngineOverride[];
	completions: EngineCompletion[];
	from: string;
	to: string;
};

// Expand every task into its occurrences in the window, applying overrides
// (cancel / field overrides) and attaching each day's completion status.
export function expandOccurrences({
	tasks,
	overrides,
	completions,
	from,
	to,
}: ExpandInput): Occurrence[] {
	const overrideMap = new Map(
		overrides.map((o) => [key(o.taskId, o.occurrenceDate), o]),
	);
	const statusMap = new Map(
		completions.map((c) => [key(c.taskId, c.occurrenceDate), c.status]),
	);

	const result: Occurrence[] = [];
	for (const task of tasks) {
		for (const date of occurrenceDates(task, from, to)) {
			const ov = overrideMap.get(key(task.id, date));
			if (ov?.isCancelled) continue;
			result.push({
				taskId: task.id,
				occurrenceDate: date,
				title: ov?.title ?? task.title,
				description: ov?.description ?? task.description,
				timeOfDay: ov?.timeOfDay ?? task.timeOfDay,
				categoryId: ov?.categoryId ?? task.categoryId,
				priority: task.priority,
				isRecurring: task.isRecurring,
				recurrenceRule: task.recurrenceRule,
				isOverride: Boolean(ov),
				status: statusMap.get(key(task.id, date)) ?? null,
			});
		}
	}

	// Sort by time (nulls last), then title.
	result.sort((a, b) => {
		if (a.occurrenceDate !== b.occurrenceDate)
			return a.occurrenceDate < b.occurrenceDate ? -1 : 1;
		const ta = a.timeOfDay ?? '99:99';
		const tb = b.timeOfDay ?? '99:99';
		if (ta !== tb) return ta < tb ? -1 : 1;
		return a.title.localeCompare(b.title);
	});
	return result;
}

const WEEKDAY_LABEL: Record<RuleWeekday, string> = {
	MO: 'seg',
	TU: 'ter',
	WE: 'qua',
	TH: 'qui',
	FR: 'sex',
	SA: 'sáb',
	SU: 'dom',
};

// Human-readable pt-BR description of a rule (for the editor preview).
export function describeRecurrence(rule: RecurrenceRule): string {
	const n = rule.interval ?? 1;
	switch (rule.freq) {
		case 'daily':
			return n > 1 ? `A cada ${n} dias` : 'Todos os dias';
		case 'weekly':
			if (rule.byweekday?.length) {
				const days = rule.byweekday.map((d) => WEEKDAY_LABEL[d]).join(', ');
				return `Toda semana: ${days}`;
			}
			return n > 1 ? `A cada ${n} semanas` : 'Toda semana';
		case 'monthly':
			if (rule.bymonthday?.length)
				return `Todo mês no dia ${rule.bymonthday.join(', ')}`;
			return n > 1 ? `A cada ${n} meses` : 'Todo mês';
		case 'yearly':
			return n > 1 ? `A cada ${n} anos` : 'Todo ano';
	}
}
