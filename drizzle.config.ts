import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

config({ path: ['.env.local', '.env'] })

const url = process.env.DATABASE_URL || "";

if(!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined in the environment variables.");
}

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url,
  },
  // Don't let drizzle try to create/drop Supabase's built-in roles
  // (authenticated, anon, service_role) referenced by the RLS policies.
  entities: {
    roles: {
      provider: 'supabase',
    },
  },
})
