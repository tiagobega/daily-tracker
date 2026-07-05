import { useForm } from '@tanstack/react-form';
import { Button } from '#/components/ui/button';
import { Input } from '#/components/ui/input';
import { Label } from '#/components/ui/label';
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from '#/components/ui/sheet';
import { Textarea } from '#/components/ui/textarea';
import { cn } from '#/lib/utils';
import type { DayTask } from '../server';

const PRIORITIES = [
	['low', 'Baixa'],
	['medium', 'Média'],
	['high', 'Alta'],
] as const;

type Priority = (typeof PRIORITIES)[number][0];

export type TaskEditValues = {
	title: string;
	description: string | null;
	timeOfDay: string | null;
	priority: Priority;
};

export function TaskEditSheet({
	task,
	open,
	onOpenChange,
	onSubmit,
	isSaving,
}: {
	task: DayTask;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (values: TaskEditValues) => Promise<void>;
	isSaving: boolean;
}) {
	const form = useForm({
		defaultValues: {
			title: task.title,
			description: task.description ?? '',
			timeOfDay: task.time_of_day?.slice(0, 5) ?? '',
			priority: task.priority as Priority,
		},
		onSubmit: async ({ value }) => {
			await onSubmit({
				title: value.title.trim(),
				description: value.description.trim() || null,
				timeOfDay: value.timeOfDay || null,
				priority: value.priority,
			});
			onOpenChange(false);
		},
	});

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="bottom" className="mx-auto max-w-md">
				<SheetHeader>
					<SheetTitle>Editar tarefa</SheetTitle>
					<SheetDescription>Altere os detalhes da tarefa.</SheetDescription>
				</SheetHeader>

				<form
					className="flex flex-col gap-4 px-4"
					onSubmit={(e) => {
						e.preventDefault();
						form.handleSubmit();
					}}
				>
					<form.Field name="title">
						{(field) => (
							<div className="flex flex-col gap-1.5">
								<Label htmlFor="edit-title">Título</Label>
								<Input
									id="edit-title"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							</div>
						)}
					</form.Field>

					<form.Field name="description">
						{(field) => (
							<div className="flex flex-col gap-1.5">
								<Label htmlFor="edit-description">Descrição</Label>
								<Textarea
									id="edit-description"
									rows={3}
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							</div>
						)}
					</form.Field>

					<form.Field name="timeOfDay">
						{(field) => (
							<div className="flex flex-col gap-1.5">
								<Label htmlFor="edit-time">Horário</Label>
								<Input
									id="edit-time"
									type="time"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							</div>
						)}
					</form.Field>

					<form.Field name="priority">
						{(field) => (
							<div className="flex flex-col gap-1.5">
								<Label>Prioridade</Label>
								<div className="flex gap-2">
									{PRIORITIES.map(([value, label]) => (
										<button
											key={value}
											type="button"
											onClick={() => field.handleChange(value)}
											className={cn(
												'flex-1 rounded-md border px-3 py-2 font-medium text-sm',
												field.state.value === value && 'bg-foreground text-background',
											)}
										>
											{label}
										</button>
									))}
								</div>
							</div>
						)}
					</form.Field>

					<SheetFooter className="px-0">
						<Button type="submit" disabled={isSaving}>
							{isSaving ? 'Salvando…' : 'Salvar'}
						</Button>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancelar
						</Button>
					</SheetFooter>
				</form>
			</SheetContent>
		</Sheet>
	);
}
