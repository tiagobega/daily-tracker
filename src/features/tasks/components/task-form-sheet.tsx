import { useForm } from '@tanstack/react-form';
import { CalendarIcon } from 'lucide-react';
import { Button } from '#/components/ui/button';
import { Calendar } from '#/components/ui/calendar';
import { Field, FieldGroup, FieldLabel } from '#/components/ui/field';
import { Input } from '#/components/ui/input';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '#/components/ui/popover';
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from '#/components/ui/sheet';
import { Textarea } from '#/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group';
import {
	dateToISODate,
	formatShortDate,
	isoToLocalDate,
	todayISO,
} from '#/lib/date';
import type { RecurrenceRule } from '#/lib/recurrence-rule';
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
	startsOn: string;
	timeOfDay: string | null;
	priority: Priority;
	isRecurring: boolean;
	recurrenceRule: RecurrenceRule | null;
};

export type TaskFormInitial = {
	title?: string;
	description?: string | null;
	startsOn?: string;
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
			startsOn: initial?.startsOn ?? todayISO(),
			timeOfDay: initial?.timeOfDay?.slice(0, 5) ?? '',
			priority: initial?.priority ?? ('medium' as Priority),
			recurrenceRule: initial?.recurrenceRule ?? null,
		},
		onSubmit: async ({ value }) => {
			await onSubmit({
				title: value.title.trim(),
				description: value.description.trim() || null,
				startsOn: value.startsOn,
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
					className="px-4 pb-4"
					onSubmit={(e) => {
						e.preventDefault();
						form.handleSubmit();
					}}
				>
					<FieldGroup>
						<form.Field name="title">
							{(field) => (
								<Field>
									<FieldLabel htmlFor="task-title">Título</FieldLabel>
									<Input
										id="task-title"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
									/>
								</Field>
							)}
						</form.Field>

						<form.Field name="description">
							{(field) => (
								<Field>
									<FieldLabel htmlFor="task-description">Descrição</FieldLabel>
									<Textarea
										id="task-description"
										rows={2}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
									/>
								</Field>
							)}
						</form.Field>

						<form.Field name="startsOn">
							{(field) => (
								<Field>
									<FieldLabel>Data</FieldLabel>
									<Popover>
										<PopoverTrigger asChild>
											<Button
												type="button"
												variant="outline"
												className="justify-start font-normal"
											>
												<CalendarIcon className="size-4" />
												{formatShortDate(field.state.value)}
											</Button>
										</PopoverTrigger>
										<PopoverContent className="w-auto p-0" align="start">
											<Calendar
												mode="single"
												selected={isoToLocalDate(field.state.value)}
												onSelect={(d) =>
													field.handleChange(d ? dateToISODate(d) : field.state.value)
												}
											/>
										</PopoverContent>
									</Popover>
								</Field>
							)}
						</form.Field>

						<form.Field name="timeOfDay">
							{(field) => (
								<Field>
									<FieldLabel htmlFor="task-time">Horário</FieldLabel>
									<Input
										id="task-time"
										type="time"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
									/>
								</Field>
							)}
						</form.Field>

						<form.Field name="priority">
							{(field) => (
								<Field>
									<FieldLabel>Prioridade</FieldLabel>
									<ToggleGroup
										type="single"
										variant="outline"
										value={field.state.value}
										onValueChange={(v) => v && field.handleChange(v as Priority)}
										className="w-full"
									>
										{PRIORITIES.map(([value, label]) => (
											<ToggleGroupItem key={value} value={value} className="flex-1">
												{label}
											</ToggleGroupItem>
										))}
									</ToggleGroup>
								</Field>
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
					</FieldGroup>

					<SheetFooter className="mt-4 px-0">
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
