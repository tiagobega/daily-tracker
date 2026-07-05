import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { getSupabaseServerClient } from '#/lib/supabase/server';
import type { TablesUpdate } from '#/lib/supabase/types';
import { computeGoalProgress, type GoalLink } from './progress';

async function requireUser() {
	const supabase = getSupabaseServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) throw new Error('Não autenticado.');
	return { supabase, userId: user.id };
}

// --- schemas -------------------------------------------------------------

export const createGoalSchema = z.object({
	title: z.string().trim().min(1, 'Informe um título.'),
	description: z.string().trim().nullish(),
	targetValue: z.number().positive().nullish(),
	startsOn: z.string().nullish(),
	endsOn: z.string().nullish(),
});
export const updateGoalSchema = createGoalSchema.partial().extend({
	id: z.uuid(),
});
const idSchema = z.object({ id: z.uuid() });
const linkSchema = z.object({
	goalId: z.uuid(),
	taskId: z.uuid(),
	weight: z.number().positive().default(1),
});
const unlinkSchema = z.object({ goalId: z.uuid(), taskId: z.uuid() });

export type CreateGoalInput = z.input<typeof createGoalSchema>;
export type UpdateGoalInput = z.input<typeof updateGoalSchema>;
export type LinkTaskInput = z.input<typeof linkSchema>;
export type UnlinkTaskInput = z.input<typeof unlinkSchema>;

// --- mutations -----------------------------------------------------------

export const createGoalFn = createServerFn({ method: 'POST' })
	.validator(createGoalSchema)
	.handler(async ({ data }) => {
		const { supabase, userId } = await requireUser();
		const { data: goal, error } = await supabase
			.from('goals')
			.insert({
				user_id: userId,
				title: data.title,
				description: data.description ?? null,
				target_type: 'count',
				target_value: data.targetValue ?? null,
				starts_on: data.startsOn ?? null,
				ends_on: data.endsOn ?? null,
			})
			.select()
			.single();
		if (error) throw new Error(error.message);
		return goal;
	});

export const updateGoalFn = createServerFn({ method: 'POST' })
	.validator(updateGoalSchema)
	.handler(async ({ data }) => {
		const { supabase } = await requireUser();
		const patch: TablesUpdate<'goals'> = {};
		if (data.title !== undefined) patch.title = data.title;
		if (data.description !== undefined) patch.description = data.description;
		if (data.targetValue !== undefined) patch.target_value = data.targetValue;
		if (data.startsOn !== undefined) patch.starts_on = data.startsOn;
		if (data.endsOn !== undefined) patch.ends_on = data.endsOn;
		const { error } = await supabase
			.from('goals')
			.update(patch)
			.eq('id', data.id);
		if (error) throw new Error(error.message);
		return { ok: true };
	});

export const archiveGoalFn = createServerFn({ method: 'POST' })
	.validator(idSchema)
	.handler(async ({ data }) => {
		const { supabase } = await requireUser();
		const { error } = await supabase
			.from('goals')
			.update({ archived_at: new Date().toISOString() })
			.eq('id', data.id);
		if (error) throw new Error(error.message);
		return { ok: true };
	});

// Link a task to a goal (or update its weight) — upsert on (goal_id, task_id).
export const upsertLinkFn = createServerFn({ method: 'POST' })
	.validator(linkSchema)
	.handler(async ({ data }) => {
		const { supabase, userId } = await requireUser();
		const { error } = await supabase.from('goal_tasks').upsert(
			{
				user_id: userId,
				goal_id: data.goalId,
				task_id: data.taskId,
				weight: data.weight,
			},
			{ onConflict: 'goal_id,task_id' },
		);
		if (error) throw new Error(error.message);
		return { ok: true };
	});

export const unlinkFn = createServerFn({ method: 'POST' })
	.validator(unlinkSchema)
	.handler(async ({ data }) => {
		const { supabase } = await requireUser();
		const { error } = await supabase
			.from('goal_tasks')
			.delete()
			.eq('goal_id', data.goalId)
			.eq('task_id', data.taskId);
		if (error) throw new Error(error.message);
		return { ok: true };
	});

// --- queries -------------------------------------------------------------

export const listGoalsFn = createServerFn({ method: 'GET' }).handler(
	async () => {
		const { supabase } = await requireUser();
		const [goalsRes, linksRes, completionsRes] = await Promise.all([
			supabase
				.from('goals')
				.select('*')
				.is('archived_at', null)
				.order('created_at'),
			supabase.from('goal_tasks').select('goal_id, task_id, weight'),
			supabase
				.from('task_completions')
				.select('task_id, occurrence_date, status')
				.eq('status', 'done'),
		]);
		if (goalsRes.error) throw new Error(goalsRes.error.message);
		if (linksRes.error) throw new Error(linksRes.error.message);
		if (completionsRes.error) throw new Error(completionsRes.error.message);

		const completions = (completionsRes.data ?? []).map((c) => ({
			taskId: c.task_id,
			occurrenceDate: c.occurrence_date,
			status: c.status,
		}));

		return (goalsRes.data ?? []).map((goal) => {
			const links: GoalLink[] = (linksRes.data ?? [])
				.filter((l) => l.goal_id === goal.id)
				.map((l) => ({ taskId: l.task_id, weight: Number(l.weight) }));
			const progress = computeGoalProgress({
				links,
				completions,
				startsOn: goal.starts_on,
				endsOn: goal.ends_on,
				targetValue: goal.target_value ? Number(goal.target_value) : null,
			});
			return {
				id: goal.id,
				title: goal.title,
				description: goal.description,
				targetValue: goal.target_value ? Number(goal.target_value) : null,
				startsOn: goal.starts_on,
				endsOn: goal.ends_on,
				taskCount: links.length,
				progress,
			};
		});
	},
);

export const getGoalFn = createServerFn({ method: 'GET' })
	.validator(idSchema)
	.handler(async ({ data }) => {
		const { supabase } = await requireUser();
		const { data: goal, error } = await supabase
			.from('goals')
			.select('*')
			.eq('id', data.id)
			.single();
		if (error) throw new Error(error.message);

		const [linksRes, tasksRes] = await Promise.all([
			supabase
				.from('goal_tasks')
				.select('task_id, weight, tasks(id, title)')
				.eq('goal_id', data.id),
			supabase
				.from('tasks')
				.select('id, title')
				.is('archived_at', null)
				.order('title'),
		]);
		if (linksRes.error) throw new Error(linksRes.error.message);
		if (tasksRes.error) throw new Error(tasksRes.error.message);

		const linkRows = linksRes.data ?? [];
		const linkedIds = new Set(linkRows.map((l) => l.task_id));
		const links: GoalLink[] = linkRows.map((l) => ({
			taskId: l.task_id,
			weight: Number(l.weight),
		}));

		const completionsRes = await supabase
			.from('task_completions')
			.select('task_id, occurrence_date, status')
			.eq('status', 'done')
			.in('task_id', linkedIds.size ? [...linkedIds] : ['']);
		if (completionsRes.error) throw new Error(completionsRes.error.message);

		const progress = computeGoalProgress({
			links,
			completions: (completionsRes.data ?? []).map((c) => ({
				taskId: c.task_id,
				occurrenceDate: c.occurrence_date,
				status: c.status,
			})),
			startsOn: goal.starts_on,
			endsOn: goal.ends_on,
			targetValue: goal.target_value ? Number(goal.target_value) : null,
		});

		return {
			goal: {
				id: goal.id,
				title: goal.title,
				description: goal.description,
				targetValue: goal.target_value ? Number(goal.target_value) : null,
				startsOn: goal.starts_on,
				endsOn: goal.ends_on,
			},
			links: linkRows.map((l) => ({
				taskId: l.task_id,
				title: l.tasks?.title ?? '—',
				weight: Number(l.weight),
			})),
			linkableTasks: (tasksRes.data ?? []).filter((t) => !linkedIds.has(t.id)),
			progress,
		};
	});

export type GoalListItem = Awaited<ReturnType<typeof listGoalsFn>>[number];
export type GoalDetail = Awaited<ReturnType<typeof getGoalFn>>;
