import { useForm } from '@tanstack/react-form';
import { CalendarIcon, X } from 'lucide-react';
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
import { dateToISODate, formatShortDate, isoToLocalDate } from '#/lib/date';

export type GoalFormValues = {
	title: string;
	description: string | null;
	targetValue: number | null;
	startsOn: string | null;
	endsOn: string | null;
};

export type GoalFormInitial = Partial<GoalFormValues>;

function DateField({
	label,
	value,
	onChange,
}: {
	label: string;
	value: string | null;
	onChange: (value: string | null) => void;
}) {
	return (
		<Field>
			<FieldLabel>{label}</FieldLabel>
			<div className="flex gap-2">
				<Popover>
					<PopoverTrigger asChild>
						<Button
							type="button"
							variant="outline"
							className="flex-1 justify-start font-normal"
						>
							<CalendarIcon className="size-4" />
							{value ? formatShortDate(value) : 'Sem data'}
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-auto p-0" align="start">
						<Calendar
							mode="single"
							selected={value ? isoToLocalDate(value) : undefined}
							onSelect={(d) => onChange(d ? dateToISODate(d) : null)}
						/>
					</PopoverContent>
				</Popover>
				{value ? (
					<Button
						type="button"
						variant="ghost"
						size="icon"
						aria-label="Limpar data"
						onClick={() => onChange(null)}
					>
						<X className="size-4" />
					</Button>
				) : null}
			</div>
		</Field>
	);
}

export function GoalFormSheet({
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
	initial?: GoalFormInitial;
	isSaving: boolean;
	onSubmit: (values: GoalFormValues) => Promise<void>;
}) {
	const form = useForm({
		defaultValues: {
			title: initial?.title ?? '',
			description: initial?.description ?? '',
			targetValue: initial?.targetValue != null ? String(initial.targetValue) : '',
			startsOn: initial?.startsOn ?? null,
			endsOn: initial?.endsOn ?? null,
		},
		onSubmit: async ({ value }) => {
			await onSubmit({
				title: value.title.trim(),
				description: value.description.trim() || null,
				targetValue: value.targetValue ? Number(value.targetValue) : null,
				startsOn: value.startsOn,
				endsOn: value.endsOn,
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
					<SheetDescription>
						O progresso conta as conclusões das tarefas vinculadas.
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
									<FieldLabel htmlFor="goal-title">Título</FieldLabel>
									<Input
										id="goal-title"
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
									<FieldLabel htmlFor="goal-description">Descrição</FieldLabel>
									<Textarea
										id="goal-description"
										rows={2}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
									/>
								</Field>
							)}
						</form.Field>

						<form.Field name="targetValue">
							{(field) => (
								<Field>
									<FieldLabel htmlFor="goal-target">Meta (nº de conclusões)</FieldLabel>
									<Input
										id="goal-target"
										type="number"
										min={1}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
									/>
								</Field>
							)}
						</form.Field>

						<form.Field name="startsOn">
							{(field) => (
								<DateField
									label="Início (opcional)"
									value={field.state.value}
									onChange={(v) => field.handleChange(v)}
								/>
							)}
						</form.Field>

						<form.Field name="endsOn">
							{(field) => (
								<DateField
									label="Prazo (opcional)"
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
