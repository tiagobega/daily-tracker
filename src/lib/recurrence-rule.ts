import { z } from 'zod';

// Structured recurrence rule stored in `tasks.recurrence_rule` (jsonb).
// This defines only the STORAGE shape + validation; the expansion engine
// (convert to `rrule` and compute occurrences) arrives in Fase 4.
export const weekdaySchema = z.enum(['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']);

export const recurrenceRuleSchema = z.object({
	freq: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
	interval: z.number().int().positive().optional(),
	byweekday: z.array(weekdaySchema).optional(),
	bymonthday: z.array(z.number().int().min(1).max(31)).optional(),
	// ISO date (YYYY-MM-DD) — end of the series, inclusive.
	until: z.string().optional(),
});

export type RecurrenceRule = z.infer<typeof recurrenceRuleSchema>;
export type Weekday = z.infer<typeof weekdaySchema>;
