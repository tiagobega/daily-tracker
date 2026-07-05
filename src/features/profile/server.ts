import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { getSupabaseServerClient } from '#/lib/supabase/server';

async function requireUser() {
	const supabase = getSupabaseServerClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) throw new Error('Não autenticado.');
	return { supabase, user };
}

export const updateProfileSchema = z.object({
	name: z.string().trim().nullish(),
	timezone: z.string().nullish(),
});
export type UpdateProfileInput = z.input<typeof updateProfileSchema>;

export const getProfileFn = createServerFn({ method: 'GET' }).handler(
	async () => {
		const { supabase, user } = await requireUser();
		const { data, error } = await supabase
			.from('profiles')
			.select('name, timezone')
			.eq('id', user.id)
			.maybeSingle();
		if (error) throw new Error(error.message);
		return {
			email: user.email ?? null,
			name: data?.name ?? null,
			timezone: data?.timezone ?? null,
		};
	},
);

export const updateProfileFn = createServerFn({ method: 'POST' })
	.validator(updateProfileSchema)
	.handler(async ({ data }) => {
		const { supabase, user } = await requireUser();
		const { error } = await supabase.from('profiles').upsert(
			{
				id: user.id,
				name: data.name ?? null,
				timezone: data.timezone ?? null,
			},
			{ onConflict: 'id' },
		);
		if (error) throw new Error(error.message);
		return { ok: true };
	});
