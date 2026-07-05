import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '#/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card';
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from '#/components/ui/empty';
import { Progress } from '#/components/ui/progress';
import { Skeleton } from '#/components/ui/skeleton';
import { GoalFormSheet } from '#/features/goals/components/goal-form-sheet';
import { goalsQueryOptions } from '#/features/goals/queries';
import { useGoalMutations } from '#/features/goals/use-goal-mutations';

export const Route = createFileRoute('/_app/goals/')({
	component: GoalsPage,
});

function GoalsPage() {
	const query = useQuery(goalsQueryOptions());
	const { createGoal } = useGoalMutations();
	const [creating, setCreating] = useState(false);
	const goals = query.data ?? [];

	return (
		<main className="flex flex-1 flex-col gap-4 p-4 pb-24">
			<h1 className="font-bold text-xl">Objetivos</h1>

			{query.isLoading ? (
				<div className="flex flex-col gap-3">
					{[0, 1].map((i) => (
						<Skeleton key={i} className="h-24 w-full rounded-lg" />
					))}
				</div>
			) : goals.length === 0 ? (
				<Empty className="flex-1">
					<EmptyHeader>
						<EmptyTitle>Sem objetivos</EmptyTitle>
						<EmptyDescription>
							Crie um objetivo e vincule tarefas para acompanhar o progresso.
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			) : (
				<div className="flex flex-col gap-3">
					{goals.map((goal) => (
						<Link key={goal.id} to="/goals/$goalId" params={{ goalId: goal.id }}>
							<Card className="transition-colors hover:bg-accent">
								<CardHeader>
									<CardTitle>{goal.title}</CardTitle>
								</CardHeader>
								<CardContent className="flex flex-col gap-2">
									<Progress value={goal.progress.percent} className="h-2" />
									<div className="flex justify-between text-muted-foreground text-xs">
										<span>
											{goal.progress.value}
											{goal.targetValue != null ? `/${goal.targetValue}` : ''} concluídas
										</span>
										<span>{goal.taskCount} tarefa(s)</span>
									</div>
								</CardContent>
							</Card>
						</Link>
					))}
				</div>
			)}

			<Button
				type="button"
				size="icon"
				aria-label="Novo objetivo"
				className="fixed right-4 bottom-20 z-10 size-14 rounded-full shadow-lg"
				onClick={() => setCreating(true)}
			>
				<Plus className="size-6" />
			</Button>

			<GoalFormSheet
				heading="Novo objetivo"
				open={creating}
				onOpenChange={setCreating}
				isSaving={createGoal.isPending}
				onSubmit={async (values) => {
					await createGoal.mutateAsync(values);
				}}
			/>
		</main>
	);
}
