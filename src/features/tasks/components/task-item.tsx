import { EllipsisVertical } from 'lucide-react';
import { useState } from 'react';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '#/components/ui/alert-dialog';
import { Badge } from '#/components/ui/badge';
import { Button } from '#/components/ui/button';
import { Checkbox } from '#/components/ui/checkbox';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu';
import { cn } from '#/lib/utils';
import type { DayTask } from '../server';
import type { useTaskMutations } from '../use-task-mutations';
import { OccurrenceEditSheet } from './occurrence-edit-sheet';
import { TaskFormSheet } from './task-form-sheet';

const PRIORITY_LABEL: Record<string, string> = {
	low: 'Baixa',
	high: 'Alta',
};

export function TaskItem({
	task,
	date,
	mutations,
}: {
	task: DayTask;
	date: string;
	mutations: ReturnType<typeof useTaskMutations>;
}) {
	const [editingSeries, setEditingSeries] = useState(false);
	const [editingDay, setEditingDay] = useState(false);
	const [confirmArchive, setConfirmArchive] = useState(false);
	const [confirmCancel, setConfirmCancel] = useState(false);
	const done = task.status === 'done';
	const time = task.timeOfDay?.slice(0, 5);
	const priorityLabel = PRIORITY_LABEL[task.priority];

	return (
		<div className="flex items-center gap-3 rounded-lg border p-3">
			<Checkbox
				checked={done}
				aria-label={done ? 'Marcar como não concluída' : 'Concluir'}
				onCheckedChange={(checked) =>
					mutations.toggleCompletion.mutate({
						taskId: task.taskId,
						occurrenceDate: date,
						completed: checked === true,
					})
				}
			/>

			<div className="min-w-0 flex-1">
				<p
					className={cn(
						'truncate font-medium',
						done && 'text-muted-foreground line-through',
					)}
				>
					{task.title}
				</p>
				{time || priorityLabel ? (
					<div className="mt-0.5 flex items-center gap-1.5">
						{time ? (
							<span className="text-muted-foreground text-xs">{time}</span>
						) : null}
						{priorityLabel ? (
							<Badge variant={task.priority === 'high' ? 'destructive' : 'secondary'}>
								{priorityLabel}
							</Badge>
						) : null}
					</div>
				) : null}
			</div>

			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="ghost" size="icon" aria-label="Ações">
						<EllipsisVertical className="size-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					{task.isRecurring ? (
						<>
							<DropdownMenuItem onSelect={() => setEditingDay(true)}>
								Editar só este dia
							</DropdownMenuItem>
							<DropdownMenuItem onSelect={() => setEditingSeries(true)}>
								Editar toda a série
							</DropdownMenuItem>
							<DropdownMenuItem onSelect={() => setConfirmCancel(true)}>
								Cancelar este dia
							</DropdownMenuItem>
							{task.isOverride ? (
								<DropdownMenuItem
									onSelect={() =>
										mutations.deleteOverride.mutate({
											taskId: task.taskId,
											occurrenceDate: date,
										})
									}
								>
									Restaurar padrão do dia
								</DropdownMenuItem>
							) : null}
						</>
					) : (
						<DropdownMenuItem onSelect={() => setEditingSeries(true)}>
							Editar
						</DropdownMenuItem>
					)}
					<DropdownMenuSeparator />
					<DropdownMenuItem
						className="text-destructive focus:text-destructive"
						onSelect={() => setConfirmArchive(true)}
					>
						Arquivar
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<TaskFormSheet
				heading="Editar tarefa"
				open={editingSeries}
				onOpenChange={setEditingSeries}
				isSaving={mutations.updateTask.isPending}
				initial={{
					title: task.title,
					description: task.description,
					startsOn: task.startsOn,
					timeOfDay: task.timeOfDay,
					priority: task.priority as 'low' | 'medium' | 'high',
					recurrenceRule: task.recurrenceRule,
				}}
				onSubmit={async (values) => {
					await mutations.updateTask.mutateAsync({
						id: task.taskId,
						...values,
					});
				}}
			/>

			<OccurrenceEditSheet
				occurrence={task}
				open={editingDay}
				onOpenChange={setEditingDay}
				isSaving={mutations.upsertOverride.isPending}
				onSubmit={async (values) => {
					await mutations.upsertOverride.mutateAsync({
						taskId: task.taskId,
						occurrenceDate: date,
						...values,
						isCancelled: false,
					});
				}}
			/>

			<AlertDialog open={confirmArchive} onOpenChange={setConfirmArchive}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Arquivar tarefa?</AlertDialogTitle>
						<AlertDialogDescription>
							Ela sai da sua lista, mas o histórico de conclusões é mantido.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => mutations.archiveTask.mutate(task.taskId)}
						>
							Arquivar
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Cancelar este dia?</AlertDialogTitle>
						<AlertDialogDescription>
							A tarefa não aparecerá nesta data. A série continua nos demais dias, e dá
							para restaurar depois.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Voltar</AlertDialogCancel>
						<AlertDialogAction
							onClick={() =>
								mutations.upsertOverride.mutate({
									taskId: task.taskId,
									occurrenceDate: date,
									isCancelled: true,
								})
							}
						>
							Cancelar o dia
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
