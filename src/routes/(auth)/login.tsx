import { useForm } from '@tanstack/react-form';
import { createFileRoute, useRouter } from '@tanstack/react-router';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { Button } from '#/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '#/components/ui/card';
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from '#/components/ui/field';
import { Input } from '#/components/ui/input';
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from '#/components/ui/input-group';
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs';
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
		<main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center p-6">
			<Card>
				<CardHeader className="text-center">
					<CardTitle className="text-2xl">Daily Tracker</CardTitle>
					<CardDescription>
						{mode === 'signin' ? 'Entre na sua conta' : 'Crie sua conta'}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Tabs
						value={mode}
						onValueChange={(v) => setMode(v as 'signin' | 'signup')}
						className="mb-6"
					>
						<TabsList className="grid w-full grid-cols-2">
							<TabsTrigger value="signin">Entrar</TabsTrigger>
							<TabsTrigger value="signup">Criar conta</TabsTrigger>
						</TabsList>
					</Tabs>

					<form
						onSubmit={(e) => {
							e.preventDefault();
							form.handleSubmit();
						}}
					>
						<FieldGroup>
							<form.Field name="email">
								{(field) => {
									const err = fieldError(field.state.meta.errors);
									return (
										<Field data-invalid={err ? true : undefined}>
											<FieldLabel htmlFor="email">E-mail</FieldLabel>
											<Input
												id="email"
												type="email"
												autoComplete="email"
												aria-invalid={err ? true : undefined}
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
											/>
											{err ? <FieldError>{err}</FieldError> : null}
										</Field>
									);
								}}
							</form.Field>

							<form.Field name="password">
								{(field) => {
									const err = fieldError(field.state.meta.errors);
									return (
										<Field data-invalid={err ? true : undefined}>
											<FieldLabel htmlFor="password">Senha</FieldLabel>
											<InputGroup>
												<InputGroupInput
													id="password"
													type={showPassword ? 'text' : 'password'}
													autoComplete={
														mode === 'signin' ? 'current-password' : 'new-password'
													}
													aria-invalid={err ? true : undefined}
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={(e) => field.handleChange(e.target.value)}
												/>
												<InputGroupAddon align="inline-end">
													<InputGroupButton
														type="button"
														size="icon-sm"
														aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
														onClick={() => setShowPassword((v) => !v)}
													>
														{showPassword ? (
															<EyeOff className="size-4" />
														) : (
															<Eye className="size-4" />
														)}
													</InputGroupButton>
												</InputGroupAddon>
											</InputGroup>
											{err ? <FieldError>{err}</FieldError> : null}
										</Field>
									);
								}}
							</form.Field>

							{formError ? (
								<p className="text-destructive text-sm">{formError}</p>
							) : null}

							<form.Subscribe selector={(s) => s.isSubmitting}>
								{(isSubmitting) => (
									<Button type="submit" className="w-full" disabled={isSubmitting}>
										{isSubmitting
											? 'Aguarde…'
											: mode === 'signin'
												? 'Entrar'
												: 'Criar conta'}
									</Button>
								)}
							</form.Subscribe>
						</FieldGroup>
					</form>
				</CardContent>
			</Card>
		</main>
	);
}
