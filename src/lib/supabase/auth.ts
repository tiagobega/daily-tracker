import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { getSupabaseServerClient } from './server';

export const credentialsSchema = z.object({
	email: z.email('Informe um e-mail válido.'),
	password: z.string().min(6, 'A senha deve ter ao menos 6 caracteres.'),
});

export type Credentials = z.infer<typeof credentialsSchema>;

// Sign up with email + password. With "Confirm email" disabled in the Supabase
// dashboard, this already creates an active session (cookies are set).
export const signUpFn = createServerFn({ method: 'POST' })
	.validator((data: unknown) => credentialsSchema.parse(data))
	.handler(async ({ data }) => {
		const supabase = getSupabaseServerClient();
		const { error } = await supabase.auth.signUp({
			email: data.email,
			password: data.password,
		});
		return { error: error?.message ?? null };
	});

export const signInFn = createServerFn({ method: 'POST' })
	.validator((data: unknown) => credentialsSchema.parse(data))
	.handler(async ({ data }) => {
		const supabase = getSupabaseServerClient();
		const { error } = await supabase.auth.signInWithPassword({
			email: data.email,
			password: data.password,
		});
		return { error: error?.message ?? null };
	});

export const signOutFn = createServerFn({ method: 'POST' }).handler(
	async () => {
		const supabase = getSupabaseServerClient();
		await supabase.auth.signOut();
	},
);

// Returns the authenticated user (or null). Runs on the server so it can read
// the session cookies; safe to call from route `beforeLoad`.
export const fetchUserFn = createServerFn({ method: 'GET' }).handler(
	async () => {
		const supabase = getSupabaseServerClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();
		return user;
	},
);
