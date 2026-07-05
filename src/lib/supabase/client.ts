import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';

// Singleton browser client. Uses the anon key (public, protected by RLS) and
// stores the session in cookies so the SSR server client can read it.
let browserClient: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function getSupabaseBrowserClient() {
	if (browserClient) return browserClient;
	browserClient = createBrowserClient<Database>(
		import.meta.env.VITE_SUPABASE_URL,
		import.meta.env.VITE_SUPABASE_ANON_KEY,
	);
	return browserClient;
}
