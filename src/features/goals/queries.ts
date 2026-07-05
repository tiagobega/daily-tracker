import { queryOptions } from '@tanstack/react-query';
import { getGoalFn, listGoalsFn } from './server';

export const goalKeys = {
	all: ['goals'] as const,
	detail: (id: string) => ['goals', 'detail', id] as const,
};

export const goalsQueryOptions = () =>
	queryOptions({
		queryKey: goalKeys.all,
		queryFn: () => listGoalsFn(),
	});

export const goalQueryOptions = (id: string) =>
	queryOptions({
		queryKey: goalKeys.detail(id),
		queryFn: () => getGoalFn({ data: { id } }),
	});
