import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { goalKeys } from './queries';
import {
	archiveGoalFn,
	type CreateGoalInput,
	createGoalFn,
	type LinkTaskInput,
	type UnlinkTaskInput,
	type UpdateGoalInput,
	unlinkFn,
	updateGoalFn,
	upsertLinkFn,
} from './server';

function errMsg(e: unknown, fallback: string) {
	return e instanceof Error ? e.message : fallback;
}

// Every goal mutation invalidates the `['goals']` prefix (list + any detail).
export function useGoalMutations() {
	const qc = useQueryClient();
	const invalidate = () => qc.invalidateQueries({ queryKey: goalKeys.all });

	const createGoal = useMutation({
		mutationFn: (input: CreateGoalInput) => createGoalFn({ data: input }),
		onSuccess: () => invalidate(),
		onError: (e) => toast.error(errMsg(e, 'Não foi possível criar o objetivo.')),
	});

	const updateGoal = useMutation({
		mutationFn: (input: UpdateGoalInput) => updateGoalFn({ data: input }),
		onSuccess: () => {
			invalidate();
			toast.success('Objetivo atualizado.');
		},
		onError: (e) => toast.error(errMsg(e, 'Não foi possível salvar.')),
	});

	const archiveGoal = useMutation({
		mutationFn: (id: string) => archiveGoalFn({ data: { id } }),
		onSuccess: () => {
			invalidate();
			toast.success('Objetivo arquivado.');
		},
		onError: (e) => toast.error(errMsg(e, 'Não foi possível arquivar.')),
	});

	const linkTask = useMutation({
		mutationFn: (input: LinkTaskInput) => upsertLinkFn({ data: input }),
		onSuccess: () => invalidate(),
		onError: (e) => toast.error(errMsg(e, 'Não foi possível vincular.')),
	});

	const unlinkTask = useMutation({
		mutationFn: (input: UnlinkTaskInput) => unlinkFn({ data: input }),
		onSuccess: () => invalidate(),
		onError: (e) => toast.error(errMsg(e, 'Não foi possível desvincular.')),
	});

	return { createGoal, updateGoal, archiveGoal, linkTask, unlinkTask };
}
