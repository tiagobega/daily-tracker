import { createFileRoute, redirect } from '@tanstack/react-router';
import { fetchUserFn } from '#/lib/supabase/auth';

// Landing: bounce to the app when logged in, otherwise to login.
export const Route = createFileRoute('/')({
	beforeLoad: async () => {
		const user = await fetchUserFn();
		throw redirect({ to: user ? '/today' : '/login' });
	},
});
