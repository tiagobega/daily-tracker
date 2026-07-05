import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { getSupabaseServerClient } from '#/lib/supabase/server';
import type { TablesUpdate } from '#/lib/supabase/types';

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
	description: z.string().trim().optional(),
	startsOn: z.string(), // YYYY-MM-DD
	timeOfDay: z.string().optional(), // HH:MM
	timezone: z.string(),
	categoryId: z.uuid().nullish(),
	priority: z.enum(['low', 'medium', 'high']).default('medium'),
	estimatedMinutes: z.number().int().positive().nullish(),
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
				is_recurring: false,
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

// Tasks for a given day (non-recurring, starts_on == date), each with its
// completion for that date. Provisional query — replaced by the recurrence
// engine in Fase 4 (see plan-docs/08).
export const listDayTasksFn = createServerFn({ method: 'GET' })
	.validator(daySchema)
	.handler(async ({ data }) => {
		const { supabase } = await requireUser();
		const [tasksRes, completionsRes] = await Promise.all([
			supabase
				.from('tasks')
				.select('*')
				.eq('starts_on', data.date)
				.is('archived_at', null)
				.order('time_of_day', { nullsFirst: false })
				.order('title'),
			supabase
				.from('task_completions')
				.select('*')
				.eq('occurrence_date', data.date),
		]);
		if (tasksRes.error) throw new Error(tasksRes.error.message);
		if (completionsRes.error) throw new Error(completionsRes.error.message);

		const statusByTask = new Map(
			(completionsRes.data ?? []).map((c) => [c.task_id, c.status]),
		);
		return (tasksRes.data ?? []).map((t) => ({
			...t,
			status: (statusByTask.get(t.id) ?? null) as CompletionStatus,
		}));
	});

export type CompletionStatus = 'done' | 'skipped' | 'partial' | null;
export type DayTask = Awaited<ReturnType<typeof listDayTasksFn>>[number];
