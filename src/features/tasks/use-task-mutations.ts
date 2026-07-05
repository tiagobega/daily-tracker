import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { taskKeys } from './queries';
import {
	archiveTaskFn,
	type CreateTaskInput,
	createTaskFn,
	type DayTask,
	type ToggleCompletionInput,
	toggleCompletionFn,
	type UpdateTaskInput,
	updateTaskFn,
} from './server';

function errMsg(e: unknown, fallback: string) {
	return e instanceof Error ? e.message : fallback;
}

// Mutations for the "Hoje" screen, all invalidating the given day's query.
// Completion toggling is optimistic with rollback (see plan-docs/10, #1/#3).
export function useTaskMutations(date: string) {
	const qc = useQueryClient();
	const key = taskKeys.day(date);
	const invalidate = () => qc.invalidateQueries({ queryKey: key });

	const createTask = useMutation({
		mutationFn: (input: CreateTaskInput) => createTaskFn({ data: input }),
		onSuccess: () => invalidate(),
		onError: (e) => toast.error(errMsg(e, 'Não foi possível criar a tarefa.')),
	});

	const updateTask = useMutation({
		mutationFn: (input: UpdateTaskInput) => updateTaskFn({ data: input }),
		onSuccess: () => {
			invalidate();
			toast.success('Tarefa atualizada.');
		},
		onError: (e) => toast.error(errMsg(e, 'Não foi possível salvar.')),
	});

	const archiveTask = useMutation({
		mutationFn: (id: string) => archiveTaskFn({ data: { id } }),
		onSuccess: () => {
			invalidate();
			toast.success('Tarefa arquivada.');
		},
		onError: (e) => toast.error(errMsg(e, 'Não foi possível arquivar.')),
	});

	const toggleCompletion = useMutation({
		mutationFn: (input: ToggleCompletionInput) =>
			toggleCompletionFn({ data: input }),
		onMutate: async (input) => {
			await qc.cancelQueries({ queryKey: key });
			const prev = qc.getQueryData<DayTask[]>(key);
			qc.setQueryData<DayTask[]>(key, (old) =>
				old?.map((t) =>
					t.taskId === input.taskId
						? { ...t, status: input.completed ? 'done' : null }
						: t,
				),
			);
			return { prev };
		},
		onError: (e, _input, ctx) => {
			if (ctx?.prev) qc.setQueryData(key, ctx.prev);
			toast.error(errMsg(e, 'Não foi possível atualizar.'));
		},
		onSettled: () => invalidate(),
	});

	return { createTask, updateTask, archiveTask, toggleCompletion };
}
