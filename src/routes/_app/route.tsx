import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { BottomNav } from '#/components/layout/bottom-nav';
import { Toaster } from '#/components/ui/sonner';
import { fetchUserFn } from '#/lib/supabase/auth';

// Authenticated layout. Guards every child route: no session → /login.
// The resolved user is exposed to children via route context.
export const Route = createFileRoute('/_app')({
	beforeLoad: async () => {
		const user = await fetchUserFn();
		if (!user) throw redirect({ to: '/login' });
		return { user };
	},
	component: AppLayout,
});

function AppLayout() {
	return (
		<div className="mx-auto flex min-h-dvh max-w-md flex-col">
			<Outlet />
			<BottomNav />
			<Toaster position="top-center" />
		</div>
	);
}
