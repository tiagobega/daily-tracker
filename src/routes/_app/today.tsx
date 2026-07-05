import { createFileRoute, useRouter } from '@tanstack/react-router';
import { useState } from 'react';
import { signOutFn } from '#/lib/supabase/auth';
// Fase 1: minimal protected route to prove the session works end-to-end.
// The real "Hoje" screen (quick-add, list, completions) lands in Fase 3.

export const Route = createFileRoute('/_app/today')({
	component: TodayPage,
});

function TodayPage() {
	const { user } = Route.useRouteContext();
	const router = useRouter();
	const [signingOut, setSigningOut] = useState(false);

	async function handleSignOut() {
		setSigningOut(true);
		await signOutFn();
		await router.invalidate();
		router.navigate({ to: '/login' });
	}

	return (
		<main className="flex flex-1 flex-col gap-6 p-6">
			<div>
				<h1 className="font-bold text-2xl">Hoje</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					Sessão ativa — a tela real chega na Fase 3.
				</p>
			</div>

			<div className="rounded-lg border p-4">
				<p className="text-muted-foreground text-xs">Logado como</p>
				<p className="font-medium">{user.email}</p>
			</div>

			<button
				type="button"
				onClick={handleSignOut}
				disabled={signingOut}
				className="mt-auto rounded-md border px-4 py-2 font-medium text-sm disabled:opacity-50"
			>
				{signingOut ? 'Saindo…' : 'Sair'}
			</button>
		</main>
	);
}
