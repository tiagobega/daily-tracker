import { createServerClient } from "@supabase/ssr"
import { getCookies, setCookie } from "@tanstack/react-start/server"

// Server-side Supabase client bound to the current request's cookies.
// Because it carries the user's JWT, every query it runs respects RLS.
// Use this inside server functions and route loaders — never the service role.
export function getSupabaseServerClient() {
	return createServerClient(
		import.meta.env.VITE_SUPABASE_URL,
		import.meta.env.VITE_SUPABASE_ANON_KEY,
		{
			cookies: {
				getAll() {
					return Object.entries(getCookies() ?? {}).map(
						([name, value]) => ({ name, value }),
					)
				},
				setAll(cookiesToSet) {
					for (const { name, value, options } of cookiesToSet) {
						setCookie(name, value, options)
					}
				},
			},
		},
	)
}
