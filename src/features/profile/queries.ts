import { queryOptions } from '@tanstack/react-query';
import { getProfileFn } from './server';

export const profileQueryOptions = () =>
	queryOptions({
		queryKey: ['profile'],
		queryFn: () => getProfileFn(),
	});
