import { queryOptions } from '@tanstack/react-query';
import { listDayTasksFn } from './server';

export const taskKeys = {
	all: ['tasks'] as const,
	day: (date: string) => ['tasks', 'day', date] as const,
};

export const dayTasksQueryOptions = (date: string) =>
	queryOptions({
		queryKey: taskKeys.day(date),
		queryFn: () => listDayTasksFn({ data: { date } }),
	});
