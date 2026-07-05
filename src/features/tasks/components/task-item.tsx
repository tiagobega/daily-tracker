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
	DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu';
import { cn } from '#/lib/utils';
import type { DayTask } from '../server';
import type { useTaskMutations } from '../use-task-mutations';
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
	const [editing, setEditing] = useState(false);
	const [confirmArchive, setConfirmArchive] = useState(false);
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
					<DropdownMenuItem onSelect={() => setEditing(true)}>
						Editar
					</DropdownMenuItem>
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
				open={editing}
				onOpenChange={setEditing}
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
		</div>
	);
}
