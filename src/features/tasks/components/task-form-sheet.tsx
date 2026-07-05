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
import type { RecurrenceRule } from '#/lib/recurrence-rule';
import { cn } from '#/lib/utils';
import { RecurrenceEditor } from './recurrence-editor';

const PRIORITIES = [
	['low', 'Baixa'],
	['medium', 'Média'],
	['high', 'Alta'],
] as const;

type Priority = (typeof PRIORITIES)[number][0];

export type TaskFormValues = {
	title: string;
	description: string | null;
	timeOfDay: string | null;
	priority: Priority;
	isRecurring: boolean;
	recurrenceRule: RecurrenceRule | null;
};

export type TaskFormInitial = {
	title?: string;
	description?: string | null;
	timeOfDay?: string | null;
	priority?: Priority;
	recurrenceRule?: RecurrenceRule | null;
};

export function TaskFormSheet({
	open,
	onOpenChange,
	heading,
	initial,
	isSaving,
	onSubmit,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	heading: string;
	initial?: TaskFormInitial;
	isSaving: boolean;
	onSubmit: (values: TaskFormValues) => Promise<void>;
}) {
	const form = useForm({
		defaultValues: {
			title: initial?.title ?? '',
			description: initial?.description ?? '',
			timeOfDay: initial?.timeOfDay?.slice(0, 5) ?? '',
			priority: initial?.priority ?? ('medium' as Priority),
			recurrenceRule: initial?.recurrenceRule ?? null,
		},
		onSubmit: async ({ value }) => {
			await onSubmit({
				title: value.title.trim(),
				description: value.description.trim() || null,
				timeOfDay: value.timeOfDay || null,
				priority: value.priority,
				isRecurring: value.recurrenceRule !== null,
				recurrenceRule: value.recurrenceRule,
			});
			form.reset();
			onOpenChange(false);
		},
	});

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="bottom"
				className="mx-auto max-h-[90dvh] max-w-md overflow-y-auto"
			>
				<SheetHeader>
					<SheetTitle>{heading}</SheetTitle>
					<SheetDescription>Preencha os detalhes da tarefa.</SheetDescription>
				</SheetHeader>

				<form
					className="flex flex-col gap-4 px-4 pb-4"
					onSubmit={(e) => {
						e.preventDefault();
						form.handleSubmit();
					}}
				>
					<form.Field name="title">
						{(field) => (
							<div className="flex flex-col gap-1.5">
								<Label htmlFor="task-title">Título</Label>
								<Input
									id="task-title"
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
								<Label htmlFor="task-description">Descrição</Label>
								<Textarea
									id="task-description"
									rows={2}
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
								<Label htmlFor="task-time">Horário</Label>
								<Input
									id="task-time"
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

					<form.Field name="recurrenceRule">
						{(field) => (
							<RecurrenceEditor
								value={field.state.value}
								onChange={(v) => field.handleChange(v)}
							/>
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
