import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '#/components/ui/button';
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from '#/components/ui/empty';
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from '#/components/ui/input-group';
import { Progress } from '#/components/ui/progress';
import { Skeleton } from '#/components/ui/skeleton';
import { TaskFormSheet } from '#/features/tasks/components/task-form-sheet';
import { TaskItem } from '#/features/tasks/components/task-item';
import { dayTasksQueryOptions } from '#/features/tasks/queries';
import { useTaskMutations } from '#/features/tasks/use-task-mutations';
import {
	addDaysISO,
	formatDayLabel,
	getLocalTimezone,
	todayISO,
} from '#/lib/date';

export const Route = createFileRoute('/_app/today')({
	validateSearch: (search: Record<string, unknown>): { date?: string } => ({
		date: typeof search.date === 'string' ? search.date : undefined,
	}),
	component: TodayPage,
});

function TodayPage() {
	const { date: dateParam } = Route.useSearch();
	const [date, setDate] = useState(() => dateParam ?? todayISO());
	const [title, setTitle] = useState('');
	const [creating, setCreating] = useState(false);
	const isToday = date === todayISO();

	const query = useQuery(dayTasksQueryOptions(date));
	const mutations = useTaskMutations(date);
	const occurrences = query.data ?? [];
	const tasks = occurrences.filter((o) => !o.isCancelled);
	const cancelled = occurrences.filter((o) => o.isCancelled);
	const doneCount = tasks.filter((t) => t.status === 'done').length;

	function handleQuickAdd(e: React.FormEvent) {
		e.preventDefault();
		const value = title.trim();
		if (!value) return;
		mutations.createTask.mutate({
			title: value,
			startsOn: date,
			timezone: getLocalTimezone(),
		});
		setTitle('');
	}

	return (
		<main className="flex flex-1 flex-col gap-4 p-4 pb-24">
			<header className="flex flex-col gap-3">
				<h1 className="font-bold text-xl">{isToday ? 'Hoje' : 'Tarefas'}</h1>
				<div className="flex items-center justify-between gap-2">
					<Button
						variant="outline"
						size="icon"
						onClick={() => setDate(addDaysISO(date, -1))}
						aria-label="Dia anterior"
					>
						<ChevronLeft className="size-4" />
					</Button>
					<span className="text-muted-foreground text-sm capitalize">
						{formatDayLabel(date)}
					</span>
					<Button
						variant="outline"
						size="icon"
						onClick={() => setDate(addDaysISO(date, 1))}
						aria-label="Próximo dia"
					>
						<ChevronRight className="size-4" />
					</Button>
				</div>
				{!isToday ? (
					<Button
						variant="link"
						className="h-auto self-center p-0"
						onClick={() => setDate(todayISO())}
					>
						Voltar para hoje
					</Button>
				) : null}
			</header>

			<form onSubmit={handleQuickAdd}>
				<InputGroup>
					<InputGroupInput
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						placeholder="O que precisa fazer?"
						aria-label="Nova tarefa"
					/>
					<InputGroupAddon align="inline-end">
						<InputGroupButton
							type="submit"
							size="icon-sm"
							variant="default"
							disabled={!title.trim() || mutations.createTask.isPending}
							aria-label="Adicionar"
						>
							<Plus className="size-4" />
						</InputGroupButton>
					</InputGroupAddon>
				</InputGroup>
			</form>

			{tasks.length > 0 ? (
				<div className="flex items-center gap-3">
					<Progress value={(doneCount / tasks.length) * 100} className="h-2" />
					<span className="whitespace-nowrap text-muted-foreground text-xs">
						{doneCount}/{tasks.length}
					</span>
				</div>
			) : null}

			{query.isLoading ? (
				<div className="flex flex-col gap-2">
					{[0, 1, 2].map((i) => (
						<Skeleton key={i} className="h-14 w-full rounded-lg" />
					))}
				</div>
			) : occurrences.length === 0 ? (
				<Empty className="flex-1">
					<EmptyHeader>
						<EmptyTitle>Nada por aqui</EmptyTitle>
						<EmptyDescription>Adicione sua primeira tarefa acima.</EmptyDescription>
					</EmptyHeader>
				</Empty>
			) : (
				<div className="flex flex-col gap-2">
					{tasks.map((task) => (
						<TaskItem
							key={task.taskId}
							task={task}
							date={date}
							mutations={mutations}
						/>
					))}
				</div>
			)}

			{cancelled.length > 0 ? (
				<div className="flex flex-col gap-2">
					<p className="font-medium text-muted-foreground text-sm">
						Canceladas hoje
					</p>
					{cancelled.map((task) => (
						<div
							key={task.taskId}
							className="flex items-center gap-3 rounded-lg border border-dashed p-3"
						>
							<span className="min-w-0 flex-1 truncate text-muted-foreground line-through">
								{task.title}
							</span>
							<Button
								variant="outline"
								size="sm"
								onClick={() =>
									mutations.deleteOverride.mutate({
										taskId: task.taskId,
										occurrenceDate: date,
									})
								}
							>
								Restaurar
							</Button>
						</div>
					))}
				</div>
			) : null}

			<Button
				type="button"
				size="icon"
				aria-label="Nova tarefa"
				className="fixed right-4 bottom-20 z-10 size-14 rounded-full shadow-lg"
				onClick={() => setCreating(true)}
			>
				<Plus className="size-6" />
			</Button>

			<TaskFormSheet
				heading="Nova tarefa"
				open={creating}
				onOpenChange={setCreating}
				isSaving={mutations.createTask.isPending}
				initial={{ startsOn: date }}
				onSubmit={async (values) => {
					await mutations.createTask.mutateAsync({
						...values,
						timezone: getLocalTimezone(),
					});
				}}
			/>
		</main>
	);
}
