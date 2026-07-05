// Regenerates src/lib/supabase/database.types.ts from the remote Supabase DB.
// Derives the project ref from VITE_SUPABASE_URL (public) and uses the
// logged-in Supabase CLI. Run with: pnpm update-types
import { execSync } from "node:child_process"
import { config } from "dotenv"

config({ path: [".env.local", ".env"] })

const url = process.env.VITE_SUPABASE_URL
if (!url) {
	console.error("VITE_SUPABASE_URL is not set in .env.local")
	process.exit(1)
}

const ref = new URL(url).host.split(".")[0]
const out = "src/lib/supabase/database.types.ts"

execSync(
	`pnpm exec supabase gen types typescript --project-id ${ref} --schema public > ${out}`,
	{ stdio: "inherit", shell: true },
)

console.log(`✓ ${out} updated`)
