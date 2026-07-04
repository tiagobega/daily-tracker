# 02 — Arquitetura de pastas

## Princípio

Organizar por **feature de domínio**, não por tipo técnico. Cada feature reúne seus componentes, queries, server functions e tipos. Rotas ficam finas (só orquestram); a lógica vive em `features/`. O motor de recorrência é código **puro e isolado**, para ser testável sem banco.

## Estrutura proposta

```
src/
  routes/                        # file-based (TanStack Router) — rotas finas
    __root.tsx                   # shell do app (já existe)
    index.tsx                    # redirect → /today (autenticado) ou /login
    (auth)/                      # grupo sem layout de app
      login.tsx
      callback.tsx               # troca de code por sessão (OAuth/magic link)
    _app/                        # layout autenticado (guarda de sessão)
      route.tsx                  # beforeLoad: exige sessão; navegação inferior
      today.tsx                  # visão do dia
      calendar.tsx               # visão de calendário
      categories.tsx             # gestão de nichos
      tasks/
        index.tsx                # lista de tasks principais
        $taskId.tsx              # detalhe/edição da task
      goals/
        index.tsx
        $goalId.tsx
      settings.tsx

  features/                      # domínio por feature
    auth/
      queries.ts                 # sessão/usuário atual
      components/                # forms de login etc.
    categories/
      queries.ts                 # queryOptions
      server.ts                  # server functions (CRUD)
      types.ts
      components/
    tasks/
      recurrence.ts              # MOTOR DE EXPANSÃO — puro, testável (ver doc 04)
      recurrence.test.ts         # testes do motor
      queries.ts                 # queryOptions (dia/range)
      server.ts                  # server functions (CRUD + overrides)
      types.ts
      components/                # TaskForm, TaskCard, RecurrenceEditor...
    completions/
      server.ts                  # toggle de conclusão por (task, data)
      queries.ts
    goals/
      server.ts
      queries.ts
      progress.ts                # progresso derivado + ponderado (goal_tasks.weight)
      types.ts
      components/

  components/
    ui/                          # shadcn/ui (gerado por CLI)
    form/                        # useAppForm + field wrappers (@tanstack/react-form + Zod)
    layout/                      # AppShell, BottomNav, Header... (ver doc 10)

  db/
    schema.ts                    # Drizzle: tabelas + pgPolicy (RLS)
    index.ts                     # client Drizzle (só migrations/seed/rotinas server)

  lib/
    supabase/
      client.ts                  # createBrowserClient<Database> (@supabase/ssr)
      server.ts                  # createServerClient<Database> (cookies do request)
      database.types.ts          # gerado por `supabase gen types` (não editar à mão)
      types.ts                   # overrides (MergeDeep) + shorthands (Tables<'tasks'>)
    date.ts                      # helpers de data/timezone (occurrence_date, DST)
    utils.ts                     # cn() (já existe)

  integrations/
    tanstack-query/              # já existe (root-provider, devtools)

  router.tsx                     # composição do router (já existe)
```

## Convenções

- **Aliases:** usar `#/*` (subpath import real do Node) para todos os imports internos — ex.: `import { db } from "#/db"`. `@/*` existe como alias equivalente, mas `#/*` é o padrão do projeto.
- **Rotas finas:** um arquivo de rota carrega dados via `loader` (usando `queryOptions` da feature) e renderiza componentes da feature. Nada de lógica de domínio dentro de `routes/`.
- **Server functions:** todo acesso a dados sensível passa por `createServerFn` (TanStack Start) dentro de `features/*/server.ts`, usando o **Supabase server client** (`lib/supabase/server.ts`) — assim a RLS é aplicada com a sessão do usuário.
- **`db/index.ts` é server-only:** o client Drizzle direto (conexão privilegiada) é usado apenas para migrations, seed e rotinas administrativas — **nunca** para servir dados ao usuário em runtime (isso burlaria a RLS). Ver [01](./01-diagnostico-e-stack.md).
- **Motor de recorrência puro:** `features/tasks/recurrence.ts` não importa banco nem React; recebe tasks + overrides + conclusões e devolve ocorrências. Isso o torna trivialmente testável (ver [09](./09-plano-de-testes.md)).
- **Grupos de rota:** `(auth)` agrupa telas públicas sem o layout do app; `_app` é o layout autenticado com guarda de sessão em `beforeLoad`.

## Por que separar `queries.ts` de `server.ts`

- `server.ts` — funções que rodam **no servidor** (acesso a dados via Supabase server client, com RLS).
- `queries.ts` — `queryOptions` do TanStack Query que **chamam** as server functions e definem `queryKey`/`staleTime`. É o que os loaders de rota e os componentes consomem. Mantém o cache e o SSR/hidratação consistentes.

> Próximo: [03 — Modelo de dados](./03-modelo-de-dados.md)
