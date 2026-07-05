// Pure, derived goal progress (plan-docs/03). Progress = weighted sum of "done"
// completions of the goal's linked tasks, within the goal's horizon. No DB.

export type GoalLink = { taskId: string; weight: number };
export type ProgressCompletion = {
	taskId: string;
	occurrenceDate: string; // YYYY-MM-DD
	status: string;
};

export type GoalProgress = { value: number; percent: number };

export function computeGoalProgress(input: {
	links: GoalLink[];
	completions: ProgressCompletion[];
	startsOn?: string | null;
	endsOn?: string | null;
	targetValue?: number | null;
}): GoalProgress {
	const { links, completions, startsOn, endsOn, targetValue } = input;
	const weightByTask = new Map(links.map((l) => [l.taskId, l.weight]));

	let value = 0;
	for (const c of completions) {
		if (c.status !== 'done') continue;
		if (startsOn && c.occurrenceDate < startsOn) continue;
		if (endsOn && c.occurrenceDate > endsOn) continue;
		const weight = weightByTask.get(c.taskId);
		if (weight === undefined) continue;
		value += weight;
	}

	const percent =
		targetValue && targetValue > 0
			? Math.min(100, Math.round((value / targetValue) * 100))
			: 0;
	return { value, percent };
}
