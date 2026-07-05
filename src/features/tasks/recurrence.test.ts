// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
	describeRecurrence,
	type EngineTask,
	expandOccurrences,
} from './recurrence';

function task(
	partial: Partial<EngineTask> & { id: string; startsOn: string },
): EngineTask {
	return {
		title: 'T',
		description: null,
		categoryId: null,
		priority: 'medium',
		timeOfDay: null,
		isRecurring: false,
		recurrenceRule: null,
		...partial,
	};
}

function expand(
	tasks: EngineTask[],
	from: string,
	to: string,
	extra: Partial<Parameters<typeof expandOccurrences>[0]> = {},
) {
	return expandOccurrences({
		tasks,
		overrides: [],
		completions: [],
		from,
		to,
		...extra,
	});
}

const utcDay = (iso: string) => new Date(`${iso}T00:00:00Z`).getUTCDay();

describe('expandOccurrences — recorrência', () => {
	it('diária: 7 dias → 7 ocorrências consecutivas', () => {
		const t = task({
			id: 'a',
			startsOn: '2026-07-01',
			isRecurring: true,
			recurrenceRule: { freq: 'daily' },
		});
		const dates = expand([t], '2026-07-01', '2026-07-07').map(
			(o) => o.occurrenceDate,
		);
		expect(dates).toEqual([
			'2026-07-01',
			'2026-07-02',
			'2026-07-03',
			'2026-07-04',
			'2026-07-05',
			'2026-07-06',
			'2026-07-07',
		]);
	});

	it('semanal por dias: só segundas e quintas', () => {
		const t = task({
			id: 'a',
			startsOn: '2026-07-01',
			isRecurring: true,
			recurrenceRule: { freq: 'weekly', byweekday: ['MO', 'TH'] },
		});
		const dates = expand([t], '2026-07-01', '2026-07-21').map(
			(o) => o.occurrenceDate,
		);
		expect(dates.length).toBeGreaterThan(0);
		expect(dates.every((d) => utcDay(d) === 1 || utcDay(d) === 4)).toBe(true);
	});

	it('intervalo: a cada 2 dias', () => {
		const t = task({
			id: 'a',
			startsOn: '2026-07-01',
			isRecurring: true,
			recurrenceRule: { freq: 'daily', interval: 2 },
		});
		const dates = expand([t], '2026-07-01', '2026-07-07').map(
			(o) => o.occurrenceDate,
		);
		expect(dates).toEqual([
			'2026-07-01',
			'2026-07-03',
			'2026-07-05',
			'2026-07-07',
		]);
	});

	it('until: respeita o fim da série', () => {
		const t = task({
			id: 'a',
			startsOn: '2026-07-01',
			isRecurring: true,
			recurrenceRule: { freq: 'daily', until: '2026-07-03' },
		});
		const dates = expand([t], '2026-07-01', '2026-07-31').map(
			(o) => o.occurrenceDate,
		);
		expect(dates).toEqual(['2026-07-01', '2026-07-02', '2026-07-03']);
	});

	it('pontual: 1 ocorrência em starts_on; nada fora da janela', () => {
		const t = task({ id: 'a', startsOn: '2026-07-10' });
		expect(expand([t], '2026-07-10', '2026-07-10')).toHaveLength(1);
		expect(expand([t], '2026-07-01', '2026-07-09')).toHaveLength(0);
	});

	it('janela vazia: nada fora do range', () => {
		const t = task({
			id: 'a',
			startsOn: '2026-01-01',
			isRecurring: true,
			recurrenceRule: { freq: 'daily' },
		});
		expect(expand([t], '2026-07-01', '2026-07-03')).toHaveLength(3);
	});

	it('sem drift: 60 dias diários → 60 datas distintas e sem buracos', () => {
		const t = task({
			id: 'a',
			startsOn: '2026-10-15',
			isRecurring: true,
			recurrenceRule: { freq: 'daily' },
		});
		const dates = expand([t], '2026-10-15', '2026-12-13').map(
			(o) => o.occurrenceDate,
		);
		expect(new Set(dates).size).toBe(60);
		for (let i = 1; i < dates.length; i++) {
			const prev = new Date(`${dates[i - 1]}T00:00:00Z`);
			const cur = new Date(`${dates[i]}T00:00:00Z`);
			expect((cur.getTime() - prev.getTime()) / 86400000).toBe(1);
		}
	});
});

describe('expandOccurrences — overrides e conclusões', () => {
	const daily = task({
		id: 'a',
		title: 'Escovar os dentes',
		startsOn: '2026-07-01',
		timeOfDay: '08:00',
		isRecurring: true,
		recurrenceRule: { freq: 'daily' },
	});

	it('override de título: muda só naquele dia', () => {
		const occ = expand([daily], '2026-07-07', '2026-07-09', {
			overrides: [
				{
					taskId: 'a',
					occurrenceDate: '2026-07-08',
					title: 'Escovar com pasta XPTO',
					description: null,
					timeOfDay: null,
					categoryId: null,
					isCancelled: false,
				},
			],
		});
		expect(occ.find((o) => o.occurrenceDate === '2026-07-08')?.title).toBe(
			'Escovar com pasta XPTO',
		);
		expect(occ.find((o) => o.occurrenceDate === '2026-07-07')?.title).toBe(
			'Escovar os dentes',
		);
		expect(occ.find((o) => o.occurrenceDate === '2026-07-08')?.isOverride).toBe(
			true,
		);
	});

	it('cancelamento: mantém a ocorrência marcada como cancelada', () => {
		const occ = expand([daily], '2026-07-07', '2026-07-09', {
			overrides: [
				{
					taskId: 'a',
					occurrenceDate: '2026-07-08',
					title: null,
					description: null,
					timeOfDay: null,
					categoryId: null,
					isCancelled: true,
				},
			],
		});
		// All three dates present; the 8th is flagged cancelled.
		expect(occ).toHaveLength(3);
		const cancelled = occ.filter((o) => o.isCancelled);
		expect(cancelled.map((o) => o.occurrenceDate)).toEqual(['2026-07-08']);
		// Consumers filter cancelled out of the active list.
		expect(occ.filter((o) => !o.isCancelled)).toHaveLength(2);
	});

	it('conclusão: status anexado só no dia concluído', () => {
		const occ = expand([daily], '2026-07-07', '2026-07-08', {
			completions: [{ taskId: 'a', occurrenceDate: '2026-07-07', status: 'done' }],
		});
		expect(occ.find((o) => o.occurrenceDate === '2026-07-07')?.status).toBe(
			'done',
		);
		expect(occ.find((o) => o.occurrenceDate === '2026-07-08')?.status).toBe(null);
	});
});

describe('describeRecurrence', () => {
	it('descreve regras comuns em pt-BR', () => {
		expect(describeRecurrence({ freq: 'daily' })).toBe('Todos os dias');
		expect(describeRecurrence({ freq: 'daily', interval: 2 })).toBe(
			'A cada 2 dias',
		);
		expect(describeRecurrence({ freq: 'weekly', byweekday: ['MO', 'TH'] })).toBe(
			'Toda semana: seg, qui',
		);
		expect(describeRecurrence({ freq: 'monthly', bymonthday: [1] })).toBe(
			'Todo mês no dia 1',
		);
	});
});
