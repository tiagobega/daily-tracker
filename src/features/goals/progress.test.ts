// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { computeGoalProgress, type ProgressCompletion } from './progress';

const done = (taskId: string, date: string): ProgressCompletion => ({
	taskId,
	occurrenceDate: date,
	status: 'done',
});

describe('computeGoalProgress', () => {
	it('soma ponderada das conclusões done das tasks vinculadas', () => {
		const { value, percent } = computeGoalProgress({
			links: [
				{ taskId: 'a', weight: 1 },
				{ taskId: 'b', weight: 2 },
			],
			completions: [done('a', '2026-07-01'), done('b', '2026-07-02')],
			targetValue: 10,
		});
		expect(value).toBe(3); // 1*1 + 1*2
		expect(percent).toBe(30);
	});

	it('ignora tasks não vinculadas e status != done', () => {
		const { value } = computeGoalProgress({
			links: [{ taskId: 'a', weight: 1 }],
			completions: [
				done('a', '2026-07-01'),
				{ taskId: 'a', occurrenceDate: '2026-07-02', status: 'skipped' },
				done('x', '2026-07-03'),
			],
			targetValue: 5,
		});
		expect(value).toBe(1);
	});

	it('respeita o horizonte [startsOn, endsOn]', () => {
		const { value } = computeGoalProgress({
			links: [{ taskId: 'a', weight: 1 }],
			completions: [
				done('a', '2026-06-30'),
				done('a', '2026-07-05'),
				done('a', '2026-07-31'),
				done('a', '2026-08-01'),
			],
			startsOn: '2026-07-01',
			endsOn: '2026-07-31',
			targetValue: 10,
		});
		expect(value).toBe(2);
	});

	it('percent limitado a 100', () => {
		const { percent } = computeGoalProgress({
			links: [{ taskId: 'a', weight: 5 }],
			completions: [done('a', '2026-07-01'), done('a', '2026-07-02')],
			targetValue: 3,
		});
		expect(percent).toBe(100);
	});
});
