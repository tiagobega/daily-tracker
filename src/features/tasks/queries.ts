import { queryOptions } from '@tanstack/react-query';
import { listDayTasksFn, listRangeFn } from './server';

export const taskKeys = {
	all: ['tasks'] as const,
	day: (date: string) => ['tasks', 'day', date] as const,
	range: (from: string, to: string) => ['tasks', 'range', from, to] as const,
};

export const dayTasksQueryOptions = (date: string) =>
	queryOptions({
		queryKey: taskKeys.day(date),
		queryFn: () => listDayTasksFn({ data: { date } }),
	});

export const rangeTasksQueryOptions = (from: string, to: string) =>
	queryOptions({
		queryKey: taskKeys.range(from, to),
		queryFn: () => listRangeFn({ data: { from, to } }),
	});
