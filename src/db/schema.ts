import { sql } from 'drizzle-orm';
import {
	type AnyPgColumn,
	boolean,
	check,
	date,
	index,
	integer,
	jsonb,
	numeric,
	pgPolicy,
	pgTable,
	text,
	time,
	timestamp,
	uniqueIndex,
	uuid,
} from 'drizzle-orm/pg-core';
import { authenticatedRole, authUsers } from 'drizzle-orm/supabase';
import type { RecurrenceRule } from '#/lib/recurrence-rule';

// --- helpers -------------------------------------------------------------

// Owner-only RLS: a user may only touch rows where `col` = their auth.uid().
// `(select auth.uid())` is wrapped in a subselect per Supabase's RLS perf guide.
function ownerPolicies(name: string, col: AnyPgColumn) {
	const owner = sql`(select auth.uid()) = ${col}`;
	return [
		pgPolicy(`${name}_select`, {
			for: 'select',
			to: authenticatedRole,
			using: owner,
		}),
		pgPolicy(`${name}_insert`, {
			for: 'insert',
			to: authenticatedRole,
			withCheck: owner,
		}),
		pgPolicy(`${name}_update`, {
			for: 'update',
			to: authenticatedRole,
			using: owner,
			withCheck: owner,
		}),
		pgPolicy(`${name}_delete`, {
			for: 'delete',
			to: authenticatedRole,
			using: owner,
		}),
	];
}

const createdAt = timestamp('created_at', { withTimezone: true })
	.notNull()
	.defaultNow();
const updatedAt = timestamp('updated_at', { withTimezone: true })
	.notNull()
	.defaultNow();

// --- tables --------------------------------------------------------------

// 1:1 mirror of auth.users. Holds the user's default timezone.
export const profiles = pgTable(
	'profiles',
	{
		id: uuid('id')
			.primaryKey()
			.references(() => authUsers.id, { onDelete: 'cascade' }),
		name: text('name'),
		timezone: text('timezone'),
		createdAt,
	},
	(t) => ownerPolicies('profiles', t.id),
);

export const categories = pgTable(
	'categories',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: uuid('user_id')
			.notNull()
			.references(() => authUsers.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		color: text('color'),
		icon: text('icon'),
		createdAt,
		updatedAt,
	},
	(t) => [
		index('categories_user_id_idx').on(t.userId),
		...ownerPolicies('categories', t.userId),
	],
);

export const tasks = pgTable(
	'tasks',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: uuid('user_id')
			.notNull()
			.references(() => authUsers.id, { onDelete: 'cascade' }),
		categoryId: uuid('category_id').references(() => categories.id, {
			onDelete: 'set null',
		}),
		title: text('title').notNull(),
		description: text('description'),
		startsOn: date('starts_on').notNull(),
		timeOfDay: time('time_of_day'),
		timezone: text('timezone').notNull(),
		isRecurring: boolean('is_recurring').notNull().default(false),
		recurrenceRule: jsonb('recurrence_rule').$type<RecurrenceRule>(),
		priority: text('priority').notNull().default('medium'),
		estimatedMinutes: integer('estimated_minutes'),
		archivedAt: timestamp('archived_at', { withTimezone: true }),
		createdAt,
		updatedAt,
	},
	(t) => [
		index('tasks_user_id_idx').on(t.userId),
		index('tasks_user_starts_on_idx').on(t.userId, t.startsOn),
		index('tasks_category_id_idx').on(t.categoryId),
		check('tasks_priority_check', sql`${t.priority} in ('low','medium','high')`),
		...ownerPolicies('tasks', t.userId),
	],
);

// Overrides a single occurrence (task_id, occurrence_date) of a task.
export const taskOverrides = pgTable(
	'task_overrides',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: uuid('user_id')
			.notNull()
			.references(() => authUsers.id, { onDelete: 'cascade' }),
		taskId: uuid('task_id')
			.notNull()
			.references(() => tasks.id, { onDelete: 'cascade' }),
		occurrenceDate: date('occurrence_date').notNull(),
		title: text('title'),
		description: text('description'),
		timeOfDay: time('time_of_day'),
		categoryId: uuid('category_id').references(() => categories.id, {
			onDelete: 'set null',
		}),
		isCancelled: boolean('is_cancelled').notNull().default(false),
		createdAt,
		updatedAt,
	},
	(t) => [
		uniqueIndex('task_overrides_task_date_uq').on(t.taskId, t.occurrenceDate),
		...ownerPolicies('task_overrides', t.userId),
	],
);

// Completion / status of a single occurrence (task_id, occurrence_date).
export const taskCompletions = pgTable(
	'task_completions',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: uuid('user_id')
			.notNull()
			.references(() => authUsers.id, { onDelete: 'cascade' }),
		taskId: uuid('task_id')
			.notNull()
			.references(() => tasks.id, { onDelete: 'cascade' }),
		occurrenceDate: date('occurrence_date').notNull(),
		status: text('status').notNull().default('done'),
		completedAt: timestamp('completed_at', { withTimezone: true }),
		notes: text('notes'),
		createdAt,
	},
	(t) => [
		uniqueIndex('task_completions_task_date_uq').on(t.taskId, t.occurrenceDate),
		index('task_completions_user_date_idx').on(t.userId, t.occurrenceDate),
		check(
			'task_completions_status_check',
			sql`${t.status} in ('done','skipped','partial')`,
		),
		...ownerPolicies('task_completions', t.userId),
	],
);

export const goals = pgTable(
	'goals',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: uuid('user_id')
			.notNull()
			.references(() => authUsers.id, { onDelete: 'cascade' }),
		title: text('title').notNull(),
		description: text('description'),
		targetType: text('target_type').notNull(),
		targetValue: numeric('target_value'),
		period: text('period'),
		startsOn: date('starts_on'),
		endsOn: date('ends_on'),
		archivedAt: timestamp('archived_at', { withTimezone: true }),
		createdAt,
		updatedAt,
	},
	(t) => [
		index('goals_user_id_idx').on(t.userId),
		check(
			'goals_target_type_check',
			sql`${t.targetType} in ('count','streak','minutes')`,
		),
		...ownerPolicies('goals', t.userId),
	],
);

// M:N link between goals and tasks, with a weight for weighted progress.
export const goalTasks = pgTable(
	'goal_tasks',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: uuid('user_id')
			.notNull()
			.references(() => authUsers.id, { onDelete: 'cascade' }),
		goalId: uuid('goal_id')
			.notNull()
			.references(() => goals.id, { onDelete: 'cascade' }),
		taskId: uuid('task_id')
			.notNull()
			.references(() => tasks.id, { onDelete: 'cascade' }),
		weight: numeric('weight').notNull().default('1'),
		createdAt,
	},
	(t) => [
		uniqueIndex('goal_tasks_goal_task_uq').on(t.goalId, t.taskId),
		index('goal_tasks_goal_id_idx').on(t.goalId),
		index('goal_tasks_task_id_idx').on(t.taskId),
		...ownerPolicies('goal_tasks', t.userId),
	],
);

export const pushSubscriptions = pgTable(
	'push_subscriptions',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: uuid('user_id')
			.notNull()
			.references(() => authUsers.id, { onDelete: 'cascade' }),
		endpoint: text('endpoint').notNull(),
		p256dh: text('p256dh').notNull(),
		auth: text('auth').notNull(),
		userAgent: text('user_agent'),
		createdAt,
	},
	(t) => [
		uniqueIndex('push_subscriptions_user_endpoint_uq').on(t.userId, t.endpoint),
		...ownerPolicies('push_subscriptions', t.userId),
	],
);

// Idempotency log: one row per notification actually sent.
export const notificationLogs = pgTable(
	'notification_logs',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: uuid('user_id')
			.notNull()
			.references(() => authUsers.id, { onDelete: 'cascade' }),
		taskId: uuid('task_id')
			.notNull()
			.references(() => tasks.id, { onDelete: 'cascade' }),
		occurrenceDate: date('occurrence_date').notNull(),
		reminderKey: text('reminder_key').notNull(),
		sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => [
		uniqueIndex('notification_logs_task_date_key_uq').on(
			t.taskId,
			t.occurrenceDate,
			t.reminderKey,
		),
		...ownerPolicies('notification_logs', t.userId),
	],
);
