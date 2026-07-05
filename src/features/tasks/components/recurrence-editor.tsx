import { CalendarIcon } from 'lucide-react';
import { Button } from '#/components/ui/button';
import { Calendar } from '#/components/ui/calendar';
import { Field, FieldDescription, FieldLabel } from '#/components/ui/field';
import { Input } from '#/components/ui/input';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '#/components/ui/popover';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '#/components/ui/select';
import { Switch } from '#/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group';
import { dateToISODate, formatShortDate, isoToLocalDate } from '#/lib/date';
import type { RecurrenceRule, Weekday } from '#/lib/recurrence-rule';
import { describeRecurrence } from '../recurrence';

const WEEKDAYS: [Weekday, string][] = [
	['MO', 'Seg'],
	['TU', 'Ter'],
	['WE', 'Qua'],
	['TH', 'Qui'],
	['FR', 'Sex'],
	['SA', 'Sáb'],
	['SU', 'Dom'],
];

// Editor for the structured recurrence rule (plan-docs/04). Toggling the switch
// sets the rule to null (pontual) or a default daily rule.
export function RecurrenceEditor({
	value,
	onChange,
}: {
	value: RecurrenceRule | null;
	onChange: (value: RecurrenceRule | null) => void;
}) {
	const enabled = value !== null;
	const rule: RecurrenceRule = value ?? { freq: 'daily' };

	const update = (patch: Partial<RecurrenceRule>) =>
		onChange({ ...rule, ...patch });

	return (
		<div className="flex flex-col gap-3">
			<Field orientation="horizontal">
				<FieldLabel htmlFor="rec-enabled">Repetir</FieldLabel>
				<Switch
					id="rec-enabled"
					checked={enabled}
					onCheckedChange={(checked) => onChange(checked ? { freq: 'daily' } : null)}
				/>
			</Field>

			{enabled ? (
				<div className="flex flex-col gap-3 rounded-md border p-3">
					<Field>
						<FieldLabel htmlFor="rec-freq">Frequência</FieldLabel>
						<Select
							value={rule.freq}
							onValueChange={(v) =>
								update({
									freq: v as RecurrenceRule['freq'],
									byweekday: undefined,
									bymonthday: undefined,
								})
							}
						>
							<SelectTrigger id="rec-freq">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="daily">Diária</SelectItem>
								<SelectItem value="weekly">Semanal</SelectItem>
								<SelectItem value="monthly">Mensal</SelectItem>
							</SelectContent>
						</Select>
					</Field>

					<Field>
						<FieldLabel htmlFor="rec-interval">A cada</FieldLabel>
						<Input
							id="rec-interval"
							type="number"
							min={1}
							value={rule.interval ?? 1}
							onChange={(e) =>
								update({ interval: Math.max(1, Number(e.target.value) || 1) })
							}
						/>
					</Field>

					{rule.freq === 'weekly' ? (
						<Field>
							<FieldLabel>Dias da semana</FieldLabel>
							<ToggleGroup
								type="multiple"
								variant="outline"
								value={rule.byweekday ?? []}
								onValueChange={(vals) =>
									update({
										byweekday: vals.length ? (vals as Weekday[]) : undefined,
									})
								}
								className="flex-wrap justify-start"
							>
								{WEEKDAYS.map(([wd, label]) => (
									<ToggleGroupItem key={wd} value={wd} aria-label={label}>
										{label}
									</ToggleGroupItem>
								))}
							</ToggleGroup>
						</Field>
					) : null}

					{rule.freq === 'monthly' ? (
						<Field>
							<FieldLabel htmlFor="rec-monthday">Dia do mês</FieldLabel>
							<Input
								id="rec-monthday"
								type="number"
								min={1}
								max={31}
								value={rule.bymonthday?.[0] ?? ''}
								onChange={(e) => {
									const n = Number(e.target.value);
									update({ bymonthday: n >= 1 && n <= 31 ? [n] : undefined });
								}}
							/>
						</Field>
					) : null}

					<Field>
						<FieldLabel>Até (opcional)</FieldLabel>
						<Popover>
							<PopoverTrigger asChild>
								<Button
									type="button"
									variant="outline"
									className="justify-start font-normal"
								>
									<CalendarIcon className="size-4" />
									{rule.until ? formatShortDate(rule.until) : 'Sem data final'}
								</Button>
							</PopoverTrigger>
							<PopoverContent className="w-auto p-0" align="start">
								<Calendar
									mode="single"
									selected={rule.until ? isoToLocalDate(rule.until) : undefined}
									onSelect={(d) => update({ until: d ? dateToISODate(d) : undefined })}
								/>
							</PopoverContent>
						</Popover>
					</Field>

					<FieldDescription>{describeRecurrence(rule)}</FieldDescription>
				</div>
			) : null}
		</div>
	);
}
