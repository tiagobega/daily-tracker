import { drizzle } from 'drizzle-orm/node-postgres';

import * as schema from './schema.ts';

// biome-ignore lint/style/noNonNullAssertion: server-only; DATABASE_URL is required for migrations
export const db = drizzle(process.env.DATABASE_URL!, { schema });
