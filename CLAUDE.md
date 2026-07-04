# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

This is an early-stage TanStack Start app scaffolded from the starter template. Most of `src/` is still boilerplate (the home route and `todos` schema are placeholders). The README is largely the unmodified TanStack Start template README — treat its "Removing Tailwind", "Demo files", and generic how-to sections as boilerplate, not project decisions.

## Commands

```bash
pnpm dev          # Vite dev server on port 3000
pnpm build        # Production build (self-contained Nitro Node server in dist/)
pnpm preview      # Preview the production build
pnpm test         # Run Vitest once (vitest run)

pnpm check        # Biome: lint + format + organize imports (the combined gate)
pnpm lint         # Biome lint only
pnpm format       # Biome format only

pnpm generate-routes   # Regenerate src/routeTree.gen.ts (tsr generate)
```

Run a single test: `pnpm vitest run path/to/file.test.ts` (or `pnpm vitest -t "test name"`).

Serve the production build: `node dist/server/index.mjs` after `pnpm build`.

### Database (Drizzle + Postgres)

```bash
pnpm db:push      # Push schema to DB (fastest for dev iteration)
pnpm db:generate  # Generate SQL migration files into ./drizzle
pnpm db:migrate   # Apply migrations
pnpm db:studio    # Drizzle Studio
```

`DATABASE_URL` must be set (loaded from `.env.local` or `.env`). Schema lives in `src/db/schema.ts`; the connected client is exported from `src/db/index.ts` as `db`.

## Architecture

**Stack:** TanStack Start (full-stack React 19 with SSR) on Vite 8, served in production via the Nitro adapter. TanStack Router (file-based routing) + TanStack Query, with Drizzle ORM over `pg` for Postgres.

**Router + Query wiring** — the SSR data flow is the non-obvious part:
- `src/router.tsx` (`getRouter`) is the single composition point. It builds the router from the generated `routeTree`, injects a `QueryClient` as router context, and calls `setupRouterSsrQueryIntegration` so Query state dehydrates/hydrates across the SSR boundary.
- The `QueryClient` is created in `src/integrations/tanstack-query/root-provider.tsx` (`getContext`) and flows into route loaders via `MyRouterContext` (defined in `src/routes/__root.tsx`). Access it in loaders through the route context rather than instantiating a new client.
- `src/routes/__root.tsx` is the app shell (full `<html>` document via `shellComponent`) and mounts the devtools panels.

**File-based routing:** routes are files in `src/routes/`. `src/routeTree.gen.ts` is auto-generated — never edit it by hand; it regenerates on dev/build and via `pnpm generate-routes`. It's excluded from Biome.

**Server code:** use TanStack Start server functions (`createServerFn` from `@tanstack/react-start`) or route `server.handlers` for API endpoints. This is where `db` from `src/db` should be used — keep DB access server-side.

## Conventions

- **Path aliases:** both `#/*` and `@/*` map to `./src/*`. `#/*` is a real Node subpath import (declared in `package.json`); prefer it for consistency with the shadcn config.
- **Formatting (Biome, enforced):** tab indentation, double quotes. Run `pnpm check` before finishing; it also auto-organizes imports. Note the app source in `src/` mostly uses 2-space/single-quote template style — Biome's config (tabs/double-quote) is the source of truth and will reformat on `check`.
- **UI:** Tailwind CSS 4 (via `@tailwindcss/vite`, configured in `src/styles.css`, no `tailwind.config`). shadcn/ui in "new-york" style with `zinc` base color and lucide icons. Add components with `pnpm dlx shadcn@latest add <name>` (they land in `src/components/ui`). Compose class names with the `cn` helper in `src/lib/utils.ts`.
- **Tests:** Vitest with jsdom + Testing Library (`@testing-library/react`).
