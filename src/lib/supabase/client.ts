import { createBrowserClient } from "@supabase/ssr";

// Singleton browser client. Uses the anon key (public, protected by RLS) and
// stores the session in cookies so the SSR server client can read it.
let browserClient: ReturnType<typeof createBrowserClient> | undefined;

export function getSupabaseBrowserClient() {
	if (browserClient) return browserClient;
	browserClient = createBrowserClient(
		import.meta.env.VITE_SUPABASE_URL,
		import.meta.env.VITE_SUPABASE_ANON_KEY,
	);
	return browserClient;
}
