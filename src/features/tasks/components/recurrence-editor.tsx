import { Input } from '#/components/ui/input';
import { Label } from '#/components/ui/label';
import type { RecurrenceRule, Weekday } from '#/lib/recurrence-rule';
import { cn } from '#/lib/utils';
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

// Editor for the structured recurrence rule (plan-docs/04). Toggling "Repetir"
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
			<label className="flex items-center justify-between">
				<span className="font-medium text-sm">Repetir</span>
				<input
					type="checkbox"
					className="size-4"
					checked={enabled}
					onChange={(e) => onChange(e.target.checked ? { freq: 'daily' } : null)}
				/>
			</label>

			{enabled ? (
				<div className="flex flex-col gap-3 rounded-md border p-3">
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="rec-freq">Frequência</Label>
						<select
							id="rec-freq"
							value={rule.freq}
							onChange={(e) =>
								update({
									freq: e.target.value as RecurrenceRule['freq'],
									byweekday: undefined,
									bymonthday: undefined,
								})
							}
							className="rounded-md border bg-transparent px-3 py-2 text-sm"
						>
							<option value="daily">Diária</option>
							<option value="weekly">Semanal</option>
							<option value="monthly">Mensal</option>
						</select>
					</div>

					<div className="flex flex-col gap-1.5">
						<Label htmlFor="rec-interval">A cada</Label>
						<Input
							id="rec-interval"
							type="number"
							min={1}
							value={rule.interval ?? 1}
							onChange={(e) =>
								update({ interval: Math.max(1, Number(e.target.value) || 1) })
							}
						/>
					</div>

					{rule.freq === 'weekly' ? (
						<div className="flex flex-col gap-1.5">
							<Label>Dias da semana</Label>
							<div className="flex flex-wrap gap-1.5">
								{WEEKDAYS.map(([wd, label]) => {
									const active = rule.byweekday?.includes(wd) ?? false;
									return (
										<button
											key={wd}
											type="button"
											onClick={() => {
												const set = new Set(rule.byweekday ?? []);
												if (active) set.delete(wd);
												else set.add(wd);
												update({ byweekday: [...set] });
											}}
											className={cn(
												'rounded-md border px-2.5 py-1.5 text-xs',
												active && 'bg-foreground text-background',
											)}
										>
											{label}
										</button>
									);
								})}
							</div>
						</div>
					) : null}

					{rule.freq === 'monthly' ? (
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="rec-monthday">Dia do mês</Label>
							<Input
								id="rec-monthday"
								type="number"
								min={1}
								max={31}
								value={rule.bymonthday?.[0] ?? ''}
								onChange={(e) => {
									const n = Number(e.target.value);
									update({
										bymonthday: n >= 1 && n <= 31 ? [n] : undefined,
									});
								}}
							/>
						</div>
					) : null}

					<div className="flex flex-col gap-1.5">
						<Label htmlFor="rec-until">Até (opcional)</Label>
						<Input
							id="rec-until"
							type="date"
							value={rule.until ?? ''}
							onChange={(e) => update({ until: e.target.value || undefined })}
						/>
					</div>

					<p className="text-muted-foreground text-xs">{describeRecurrence(rule)}</p>
				</div>
			) : null}
		</div>
	);
}
