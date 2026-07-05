import { useForm } from '@tanstack/react-form';
import { createFileRoute, useRouter } from '@tanstack/react-router';
import { useState } from 'react';
import { credentialsSchema, signInFn, signUpFn } from '#/lib/supabase/auth';

export const Route = createFileRoute('/(auth)/login')({
	component: LoginPage,
});

// Maps common Supabase auth errors to plain Portuguese (heurística #9).
function translateError(message: string) {
	if (/invalid login credentials/i.test(message))
		return 'E-mail ou senha incorretos.';
	if (/user already registered/i.test(message))
		return 'Este e-mail já está cadastrado. Tente entrar.';
	if (/email not confirmed/i.test(message))
		return 'E-mail ainda não confirmado.';
	return message;
}

function fieldError(errors: unknown[]) {
	const first = errors[0];
	if (!first) return null;
	if (typeof first === 'string') return first;
	if (typeof first === 'object' && 'message' in first)
		return String((first as { message: unknown }).message);
	return null;
}

function LoginPage() {
	const router = useRouter();
	const [mode, setMode] = useState<'signin' | 'signup'>('signin');
	const [formError, setFormError] = useState<string | null>(null);
	const [showPassword, setShowPassword] = useState(false);

	const form = useForm({
		defaultValues: { email: '', password: '' },
		validators: { onSubmit: credentialsSchema },
		onSubmit: async ({ value }) => {
			setFormError(null);
			const action = mode === 'signin' ? signInFn : signUpFn;
			const { error } = await action({ data: value });
			if (error) {
				setFormError(translateError(error));
				return;
			}
			await router.invalidate();
			router.navigate({ to: '/today' });
		},
	});

	return (
		<main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 p-6">
			<div className="text-center">
				<h1 className="font-bold text-2xl">Daily Tracker</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					{mode === 'signin' ? 'Entre na sua conta' : 'Crie sua conta'}
				</p>
			</div>

			<div className="grid grid-cols-2 rounded-md border p-1 text-sm">
				<button
					type="button"
					onClick={() => setMode('signin')}
					className={`rounded py-1.5 font-medium ${mode === 'signin' ? 'bg-foreground text-background' : 'text-muted-foreground'}`}
				>
					Entrar
				</button>
				<button
					type="button"
					onClick={() => setMode('signup')}
					className={`rounded py-1.5 font-medium ${mode === 'signup' ? 'bg-foreground text-background' : 'text-muted-foreground'}`}
				>
					Criar conta
				</button>
			</div>

			<form
				className="flex flex-col gap-4"
				onSubmit={(e) => {
					e.preventDefault();
					form.handleSubmit();
				}}
			>
				<form.Field name="email">
					{(field) => (
						<div className="flex flex-col gap-1">
							{/** biome-ignore lint/a11y/noLabelWithoutControl: input is rendered right below */}
							<label className="font-medium text-sm">E-mail</label>
							<input
								type="email"
								autoComplete="email"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
								className="rounded-md border px-3 py-2 text-sm"
							/>
							{fieldError(field.state.meta.errors) ? (
								<p className="text-destructive text-xs">
									{fieldError(field.state.meta.errors)}
								</p>
							) : null}
						</div>
					)}
				</form.Field>

				<form.Field name="password">
					{(field) => (
						<div className="flex flex-col gap-1">
							{/** biome-ignore lint/a11y/noLabelWithoutControl: input is rendered right below */}
							<label className="font-medium text-sm">Senha</label>
							<div className="flex items-center rounded-md border">
								<input
									type={showPassword ? 'text' : 'password'}
									autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									className="flex-1 bg-transparent px-3 py-2 text-sm outline-none"
								/>
								<button
									type="button"
									onClick={() => setShowPassword((v) => !v)}
									className="px-3 text-muted-foreground text-xs"
								>
									{showPassword ? 'Ocultar' : 'Mostrar'}
								</button>
							</div>
							{fieldError(field.state.meta.errors) ? (
								<p className="text-destructive text-xs">
									{fieldError(field.state.meta.errors)}
								</p>
							) : null}
						</div>
					)}
				</form.Field>

				{formError ? <p className="text-destructive text-sm">{formError}</p> : null}

				<form.Subscribe selector={(s) => s.isSubmitting}>
					{(isSubmitting) => (
						<button
							type="submit"
							disabled={isSubmitting}
							className="rounded-md bg-foreground px-4 py-2 font-medium text-background text-sm disabled:opacity-50"
						>
							{isSubmitting
								? 'Aguarde…'
								: mode === 'signin'
									? 'Entrar'
									: 'Criar conta'}
						</button>
					)}
				</form.Subscribe>
			</form>
		</main>
	);
}
