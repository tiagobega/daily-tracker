import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, useRouter } from '@tanstack/react-router';
import { ChevronLeft, EllipsisVertical, X } from 'lucide-react';
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
import { Card, CardContent } from '#/components/ui/card';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu';
import { Field, FieldLabel } from '#/components/ui/field';
import { Input } from '#/components/ui/input';
import { Progress } from '#/components/ui/progress';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '#/components/ui/select';
import { Skeleton } from '#/components/ui/skeleton';
import { GoalFormSheet } from '#/features/goals/components/goal-form-sheet';
import { goalQueryOptions } from '#/features/goals/queries';
import { useGoalMutations } from '#/features/goals/use-goal-mutations';

export const Route = createFileRoute('/_app/goals/$goalId')({
	component: GoalDetailPage,
});

function GoalDetailPage() {
	const { goalId } = Route.useParams();
	const router = useRouter();
	const query = useQuery(goalQueryOptions(goalId));
	const { updateGoal, archiveGoal, linkTask, unlinkTask } = useGoalMutations();

	const [editing, setEditing] = useState(false);
	const [confirmArchive, setConfirmArchive] = useState(false);
	const [selectedTask, setSelectedTask] = useState('');
	const [weight, setWeight] = useState('1');

	if (query.isLoading || !query.data) {
		return (
			<main className="flex flex-1 flex-col gap-4 p-4">
				<Skeleton className="h-8 w-40" />
				<Skeleton className="h-28 w-full rounded-lg" />
			</main>
		);
	}

	const { goal, links, linkableTasks, progress } = query.data;

	async function handleArchive() {
		await archiveGoal.mutateAsync(goalId);
		router.navigate({ to: '/goals' });
	}

	function handleLink() {
		if (!selectedTask) return;
		linkTask.mutate({
			goalId,
			taskId: selectedTask,
			weight: Number(weight) || 1,
		});
		setSelectedTask('');
		setWeight('1');
	}

	return (
		<main className="flex flex-1 flex-col gap-4 p-4 pb-24">
			<header className="flex items-center gap-2">
				<Button variant="ghost" size="icon" asChild aria-label="Voltar">
					<Link to="/goals">
						<ChevronLeft className="size-4" />
					</Link>
				</Button>
				<h1 className="flex-1 truncate font-bold text-xl">{goal.title}</h1>
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
			</header>

			<Card>
				<CardContent className="flex flex-col gap-3 pt-6">
					<div className="flex items-end justify-between">
						<span className="font-bold text-3xl">{progress.percent}%</span>
						<span className="text-muted-foreground text-sm">
							{progress.value}
							{goal.targetValue != null ? `/${goal.targetValue}` : ''} concluídas
						</span>
					</div>
					<Progress value={progress.percent} className="h-2" />
					{goal.description ? (
						<p className="text-muted-foreground text-sm">{goal.description}</p>
					) : null}
				</CardContent>
			</Card>

			<section className="flex flex-col gap-2">
				<h2 className="font-medium text-sm">Tarefas vinculadas</h2>
				{links.length === 0 ? (
					<p className="text-muted-foreground text-sm">
						Nenhuma tarefa vinculada ainda.
					</p>
				) : (
					links.map((link) => (
						<div
							key={link.taskId}
							className="flex items-center gap-2 rounded-lg border p-3"
						>
							<span className="min-w-0 flex-1 truncate">{link.title}</span>
							<Badge variant="secondary">peso {link.weight}</Badge>
							<Button
								variant="ghost"
								size="icon"
								aria-label="Desvincular"
								onClick={() => unlinkTask.mutate({ goalId, taskId: link.taskId })}
							>
								<X className="size-4" />
							</Button>
						</div>
					))
				)}
			</section>

			{linkableTasks.length > 0 ? (
				<section className="flex flex-col gap-2 rounded-lg border p-3">
					<h2 className="font-medium text-sm">Vincular tarefa</h2>
					<Select value={selectedTask} onValueChange={setSelectedTask}>
						<SelectTrigger>
							<SelectValue placeholder="Escolha uma tarefa" />
						</SelectTrigger>
						<SelectContent>
							{linkableTasks.map((task) => (
								<SelectItem key={task.id} value={task.id}>
									{task.title}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<div className="flex items-end gap-2">
						<Field className="w-24">
							<FieldLabel htmlFor="link-weight">Peso</FieldLabel>
							<Input
								id="link-weight"
								type="number"
								min={1}
								value={weight}
								onChange={(e) => setWeight(e.target.value)}
							/>
						</Field>
						<Button
							type="button"
							className="flex-1"
							disabled={!selectedTask || linkTask.isPending}
							onClick={handleLink}
						>
							Vincular
						</Button>
					</div>
				</section>
			) : null}

			<GoalFormSheet
				heading="Editar objetivo"
				open={editing}
				onOpenChange={setEditing}
				isSaving={updateGoal.isPending}
				initial={{
					title: goal.title,
					description: goal.description,
					targetValue: goal.targetValue,
					startsOn: goal.startsOn,
					endsOn: goal.endsOn,
				}}
				onSubmit={async (values) => {
					await updateGoal.mutateAsync({ id: goalId, ...values });
				}}
			/>

			<AlertDialog open={confirmArchive} onOpenChange={setConfirmArchive}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Arquivar objetivo?</AlertDialogTitle>
						<AlertDialogDescription>
							Ele sai da sua lista. As tarefas e conclusões não são afetadas.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction onClick={handleArchive}>Arquivar</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</main>
	);
}
