import type { MergeDeep } from 'type-fest';
import type { RecurrenceRule } from '#/lib/recurrence-rule';
import type { Database as DatabaseGenerated } from './database.types';

// The generated types expose `tasks.recurrence_rule` as `Json`. Override it to
// the structured `RecurrenceRule` (source of truth: the Zod schema) so queries
// are properly typed. Requires `strictNullChecks` (already on via `strict`).
export type Database = MergeDeep<
	DatabaseGenerated,
	{
		public: {
			Tables: {
				tasks: {
					Row: { recurrence_rule: RecurrenceRule | null };
					Insert: { recurrence_rule?: RecurrenceRule | null };
					Update: { recurrence_rule?: RecurrenceRule | null };
				};
			};
		};
	}
>;

// Shorthands: `Tables<'tasks'>` = the Row type of a table.
export type Tables<T extends keyof Database['public']['Tables']> =
	Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> =
	Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
	Database['public']['Tables'][T]['Update'];
