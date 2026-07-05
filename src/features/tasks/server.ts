import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { recurrenceRuleSchema } from '#/lib/recurrence-rule';
import { getSupabaseServerClient } from '#/lib/supabase/server';
import type { TablesUpdate } from '#/lib/supabase/types';
import {
	type EngineCompletion,
	type EngineOverride,
	type EngineTask,
	expandOccurrences,
	type Occurrence,
} from './recurrence';

// Every mutation resolves the user from the session and sets user_id
// explicitly (the RLS WITH CHECK requires user_id = auth.uid()).
async function requireUser() {
	const supabase = getSupabaseServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) throw new Error('Não autenticado.');
	return { supabase, userId: user.id };
}

// --- schemas -------------------------------------------------------------

export const createTaskSchema = z.object({
	title: z.string().trim().min(1, 'Informe um título.'),
	description: z.string().trim().nullish(),
	startsOn: z.string(), // YYYY-MM-DD
	timeOfDay: z.string().nullish(), // HH:MM
	timezone: z.string(),
	categoryId: z.uuid().nullish(),
	priority: z.enum(['low', 'medium', 'high']).default('medium'),
	estimatedMinutes: z.number().int().positive().nullish(),
	isRecurring: z.boolean().default(false),
	recurrenceRule: recurrenceRuleSchema.nullish(),
});

export const updateTaskSchema = z.object({
	id: z.uuid(),
	title: z.string().trim().min(1, 'Informe um título.').optional(),
	description: z.string().trim().nullish(),
	startsOn: z.string().optional(),
	timeOfDay: z.string().nullish(),
	categoryId: z.uuid().nullish(),
	priority: z.enum(['low', 'medium', 'high']).optional(),
	estimatedMinutes: z.number().int().positive().nullish(),
	isRecurring: z.boolean().optional(),
	recurrenceRule: recurrenceRuleSchema.nullish(),
});

const idSchema = z.object({ id: z.uuid() });
const daySchema = z.object({ date: z.string() });
const toggleSchema = z.object({
	taskId: z.uuid(),
	occurrenceDate: z.string(),
	completed: z.boolean(),
});

export type CreateTaskInput = z.input<typeof createTaskSchema>;
export type UpdateTaskInput = z.input<typeof updateTaskSchema>;
export type ToggleCompletionInput = z.input<typeof toggleSchema>;

// --- server functions ----------------------------------------------------

export const createTaskFn = createServerFn({ method: 'POST' })
	.validator(createTaskSchema)
	.handler(async ({ data }) => {
		const { supabase, userId } = await requireUser();
		const { data: task, error } = await supabase
			.from('tasks')
			.insert({
				user_id: userId,
				title: data.title,
				description: data.description ?? null,
				starts_on: data.startsOn,
				time_of_day: data.timeOfDay ?? null,
				timezone: data.timezone,
				category_id: data.categoryId ?? null,
				priority: data.priority,
				estimated_minutes: data.estimatedMinutes ?? null,
				is_recurring: data.isRecurring,
				recurrence_rule: data.recurrenceRule ?? null,
			})
			.select()
			.single();
		if (error) throw new Error(error.message);
		return task;
	});

export const updateTaskFn = createServerFn({ method: 'POST' })
	.validator(updateTaskSchema)
	.handler(async ({ data }) => {
		const { supabase } = await requireUser();
		const patch: TablesUpdate<'tasks'> = {};
		if (data.title !== undefined) patch.title = data.title;
		if (data.description !== undefined) patch.description = data.description;
		if (data.startsOn !== undefined) patch.starts_on = data.startsOn;
		if (data.timeOfDay !== undefined) patch.time_of_day = data.timeOfDay;
		if (data.categoryId !== undefined) patch.category_id = data.categoryId;
		if (data.priority !== undefined) patch.priority = data.priority;
		if (data.estimatedMinutes !== undefined)
			patch.estimated_minutes = data.estimatedMinutes;
		if (data.isRecurring !== undefined) patch.is_recurring = data.isRecurring;
		if (data.recurrenceRule !== undefined)
			patch.recurrence_rule = data.recurrenceRule;

		const { data: task, error } = await supabase
			.from('tasks')
			.update(patch)
			.eq('id', data.id)
			.select()
			.single();
		if (error) throw new Error(error.message);
		return task;
	});

export const archiveTaskFn = createServerFn({ method: 'POST' })
	.validator(idSchema)
	.handler(async ({ data }) => {
		const { supabase } = await requireUser();
		const { error } = await supabase
			.from('tasks')
			.update({ archived_at: new Date().toISOString() })
			.eq('id', data.id);
		if (error) throw new Error(error.message);
		return { ok: true };
	});

// Mark/unmark a single occurrence (task_id, occurrence_date) as done.
// Marking upserts a completion; unmarking deletes the row. The main task is
// never touched (see plan-docs/04).
export const toggleCompletionFn = createServerFn({ method: 'POST' })
	.validator(toggleSchema)
	.handler(async ({ data }) => {
		const { supabase, userId } = await requireUser();
		if (data.completed) {
			const { error } = await supabase.from('task_completions').upsert(
				{
					user_id: userId,
					task_id: data.taskId,
					occurrence_date: data.occurrenceDate,
					status: 'done',
					completed_at: new Date().toISOString(),
				},
				{ onConflict: 'task_id,occurrence_date' },
			);
			if (error) throw new Error(error.message);
		} else {
			const { error } = await supabase
				.from('task_completions')
				.delete()
				.eq('task_id', data.taskId)
				.eq('occurrence_date', data.occurrenceDate);
			if (error) throw new Error(error.message);
		}
		return { ok: true };
	});

export const upsertOverrideSchema = z.object({
	taskId: z.uuid(),
	occurrenceDate: z.string(),
	title: z.string().trim().nullish(),
	description: z.string().trim().nullish(),
	timeOfDay: z.string().nullish(),
	isCancelled: z.boolean().default(false),
});
export type UpsertOverrideInput = z.input<typeof upsertOverrideSchema>;

const overrideKeySchema = z.object({
	taskId: z.uuid(),
	occurrenceDate: z.string(),
});
export type OverrideKeyInput = z.input<typeof overrideKeySchema>;

// Create/replace the override for a single occurrence (task_id, occurrence_date).
// A field edit sets title/description/time; "cancel this day" sets is_cancelled.
// The main task is never touched (see plan-docs/04).
export const upsertOverrideFn = createServerFn({ method: 'POST' })
	.validator(upsertOverrideSchema)
	.handler(async ({ data }) => {
		const { supabase, userId } = await requireUser();
		const { error } = await supabase.from('task_overrides').upsert(
			{
				user_id: userId,
				task_id: data.taskId,
				occurrence_date: data.occurrenceDate,
				title: data.title ?? null,
				description: data.description ?? null,
				time_of_day: data.timeOfDay ?? null,
				is_cancelled: data.isCancelled,
			},
			{ onConflict: 'task_id,occurrence_date' },
		);
		if (error) throw new Error(error.message);
		return { ok: true };
	});

// Remove an override, reverting the occurrence to the series default.
export const deleteOverrideFn = createServerFn({ method: 'POST' })
	.validator(overrideKeySchema)
	.handler(async ({ data }) => {
		const { supabase } = await requireUser();
		const { error } = await supabase
			.from('task_overrides')
			.delete()
			.eq('task_id', data.taskId)
			.eq('occurrence_date', data.occurrenceDate);
		if (error) throw new Error(error.message);
		return { ok: true };
	});

const rangeSchema = z.object({ from: z.string(), to: z.string() });

// Shared loader: expand every active task's occurrences in [from, to], applying
// overrides and completions for that window (plan-docs/04).
async function loadOccurrences(
	from: string,
	to: string,
): Promise<Occurrence[]> {
	const { supabase } = await requireUser();
	const [tasksRes, overridesRes, completionsRes] = await Promise.all([
		supabase
			.from('tasks')
			.select('*')
			.is('archived_at', null)
			.lte('starts_on', to),
		supabase
			.from('task_overrides')
			.select('*')
			.gte('occurrence_date', from)
			.lte('occurrence_date', to),
		supabase
			.from('task_completions')
			.select('*')
			.gte('occurrence_date', from)
			.lte('occurrence_date', to),
	]);
	if (tasksRes.error) throw new Error(tasksRes.error.message);
	if (overridesRes.error) throw new Error(overridesRes.error.message);
	if (completionsRes.error) throw new Error(completionsRes.error.message);

	const tasks: EngineTask[] = (tasksRes.data ?? []).map((t) => ({
		id: t.id,
		title: t.title,
		description: t.description,
		categoryId: t.category_id,
		priority: t.priority,
		startsOn: t.starts_on,
		timeOfDay: t.time_of_day,
		isRecurring: t.is_recurring,
		recurrenceRule: t.recurrence_rule,
	}));
	const overrides: EngineOverride[] = (overridesRes.data ?? []).map((o) => ({
		taskId: o.task_id,
		occurrenceDate: o.occurrence_date,
		title: o.title,
		description: o.description,
		timeOfDay: o.time_of_day,
		categoryId: o.category_id,
		isCancelled: o.is_cancelled,
	}));
	const completions: EngineCompletion[] = (completionsRes.data ?? []).map(
		(c) => ({
			taskId: c.task_id,
			occurrenceDate: c.occurrence_date,
			status: c.status as EngineCompletion['status'],
		}),
	);

	return expandOccurrences({ tasks, overrides, completions, from, to });
}

// Occurrences for a single day.
export const listDayTasksFn = createServerFn({ method: 'GET' })
	.validator(daySchema)
	.handler(
		({ data }): Promise<Occurrence[]> => loadOccurrences(data.date, data.date),
	);

// Occurrences across a date range (used by the calendar).
export const listRangeFn = createServerFn({ method: 'GET' })
	.validator(rangeSchema)
	.handler(
		({ data }): Promise<Occurrence[]> => loadOccurrences(data.from, data.to),
	);

export type { CompletionStatus } from './recurrence';
export type DayTask = Occurrence;
