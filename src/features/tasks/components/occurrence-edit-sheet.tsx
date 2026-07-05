import { useForm } from '@tanstack/react-form';
import { Button } from '#/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '#/components/ui/field';
import { Input } from '#/components/ui/input';
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from '#/components/ui/sheet';
import { Textarea } from '#/components/ui/textarea';
import type { DayTask } from '../server';

export type OccurrenceEditValues = {
	title: string;
	description: string | null;
	timeOfDay: string | null;
};

// Edits a SINGLE occurrence via a task_override (plan-docs/04). Only the columns
// an override carries: title, description, time. Priority/date/recurrence are
// series-level and stay in the full task form.
export function OccurrenceEditSheet({
	occurrence,
	open,
	onOpenChange,
	isSaving,
	onSubmit,
}: {
	occurrence: DayTask;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	isSaving: boolean;
	onSubmit: (values: OccurrenceEditValues) => Promise<void>;
}) {
	const form = useForm({
		defaultValues: {
			title: occurrence.title,
			description: occurrence.description ?? '',
			timeOfDay: occurrence.timeOfDay?.slice(0, 5) ?? '',
		},
		onSubmit: async ({ value }) => {
			await onSubmit({
				title: value.title.trim(),
				description: value.description.trim() || null,
				timeOfDay: value.timeOfDay || null,
			});
			onOpenChange(false);
		},
	});

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="bottom" className="mx-auto max-w-md">
				<SheetHeader>
					<SheetTitle>Editar só este dia</SheetTitle>
					<SheetDescription>
						A alteração vale apenas para esta data; a série continua igual.
					</SheetDescription>
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
									<FieldLabel htmlFor="occ-title">Título</FieldLabel>
									<Input
										id="occ-title"
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
									<FieldLabel htmlFor="occ-description">Descrição</FieldLabel>
									<Textarea
										id="occ-description"
										rows={2}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
									/>
								</Field>
							)}
						</form.Field>

						<form.Field name="timeOfDay">
							{(field) => (
								<Field>
									<FieldLabel htmlFor="occ-time">Horário</FieldLabel>
									<Input
										id="occ-time"
										type="time"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
									/>
								</Field>
							)}
						</form.Field>
					</FieldGroup>

					<SheetFooter className="mt-4 px-0">
						<Button type="submit" disabled={isSaving}>
							{isSaving ? 'Salvando…' : 'Salvar este dia'}
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
