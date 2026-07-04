# 01 — Diagnóstico e stack

## Estado atual do repositório (inspecionado)

O projeto é um **scaffold do template TanStack Start**, praticamente sem código de produto.

### Stack já presente

- **TanStack Start** (React 19 + SSR) sobre **Vite 8**, servido em produção pelo adaptador **Nitro**.
- **TanStack Router** (roteamento file-based em `src/routes/`) + **TanStack Query**, com integração SSR já ligada em `src/router.tsx` (`setupRouterSsrQueryIntegration`).
- **Drizzle ORM** sobre `pg` (node-postgres) — client em `src/db/index.ts`, schema em `src/db/schema.ts`.
- **Tailwind CSS 4** (via `@tailwindcss/vite`, sem `tailwind.config`) + **shadcn/ui** estilo _new-york_, base _zinc_, ícones lucide.
- **Biome** (lint + format: tabs, aspas duplas) e **Vitest** (jsdom + Testing Library).
- Aliases de import: `#/*` e `@/*` → `./src/*` (preferir `#/*`).

### O que ainda é boilerplate

- Rota única `/` de boas-vindas (`src/routes/index.tsx`).
- Schema só com a tabela placeholder `todos` (`src/db/schema.ts`).
- Nenhum server function, nenhum componente shadcn instalado, nenhuma feature de domínio.

### O que NÃO existe ainda

- **Supabase não configurado.** Sem `@supabase/supabase-js`, sem `@supabase/ssr`, sem client de auth. `DATABASE_URL` aponta para um placeholder `localhost`. Nenhuma autenticação.
- **PWA é apenas um stub.** `public/manifest.json` é o do template (nome "TanStack App", ícones genéricos). Não há service worker, `vite-plugin-pwa`, registro de SW nem meta tags de iOS.

## Decisões de stack (travadas)

### 1. Acesso a dados e RLS — Supabase client nativo

**Decisão:** usar `@supabase/supabase-js` + `@supabase/ssr` no runtime para leitura e escrita. O JWT do usuário autenticado acompanha cada request, então a **RLS do Postgres é aplicada automaticamente**. O **Drizzle permanece apenas** para _definir o schema_, declarar as _policies_ (`pgPolicy`) e _gerar/aplicar migrations_ via `drizzle-kit`.

**Por quê (o ponto crítico):** RLS é aplicada pelo Postgres com base na identidade do usuário (`auth.uid()`) presente no JWT. Se o acesso em runtime fosse feito por Drizzle sobre uma conexão de serviço (`DATABASE_URL` direto), essa conexão usa um papel privilegiado e **ignora a RLS** — a menos que se injete manualmente o contexto do usuário a cada request (`set_config('request.jwt.claims', ...)`), o que é verboso e fácil de errar em segurança. Como você quer RLS de verdade, o caminho seguro é deixar o Supabase client conduzir as queries de runtime, onde a RLS "simplesmente funciona".

**Divisão de responsabilidades:**

| Ferramenta                                | Papel                                                                             |
| ----------------------------------------- | --------------------------------------------------------------------------------- |
| `@supabase/ssr` + `@supabase/supabase-js` | Auth (sessão via cookies no SSR) e **todas** as queries de runtime (RLS aplicada) |
| Drizzle + `drizzle-kit`                   | Definição de schema, policies RLS (`pgPolicy`), geração e aplicação de migrations |
| Supabase CLI (`gen types`)                | Gera `database.types.ts` a partir do banco → tipagem das queries de runtime       |
| `service_role` (somente server)           | Rotinas privilegiadas pontuais (ex.: disparo de push), **nunca** no client        |

> Uma única toolchain de schema (Drizzle), um único caminho de dados em runtime (Supabase client). Sem dois ORMs concorrendo em runtime.

**Tipagem — Drizzle × Supabase `gen types`:** os dois convivem sem sobreposição porque atuam em pontas diferentes do fluxo. O Drizzle **escreve** o schema; o Supabase CLI **lê** o banco para gerar os tipos de runtime:

```
Drizzle schema.ts (fonte da verdade)
   │  drizzle-kit generate/push
   ▼
Supabase Postgres (schema + RLS aplicados)
   │  supabase gen types typescript
   ▼
database.types.ts  ──►  createClient<Database>()  ──►  queries type-safe (.from().select())
```

- Como o **runtime usa o Supabase client**, os tipos que importam nas queries são os **gerados pelo Supabase**, não os inferidos pelo Drizzle. Os tipos do Drizzle ficam restritos à autoria do schema/migrations.
- **Guardrail:** o **Drizzle é o único que altera o schema**. O Supabase CLI só **lê** (gera tipos) e, opcionalmente, roda o stack local. Não usar `supabase migration`/`db push` para versionar schema — isso criaria dois sistemas de migration disputando o banco.
- **`recurrence_rule` (jsonb)** sai como `Json` na geração. Sobrescrever para o tipo estruturado `RecurrenceRule` via `MergeDeep` (type-fest), tendo o **Zod** como fonte do shape (`type RecurrenceRule = z.infer<typeof recurrenceRuleSchema>`) e validando na borda. `strict: true` já está ligado no `tsconfig` (requisito do `MergeDeep`).

### 2. Push notifications — documentar em alto nível

Planejadas como **fase final** e descritas apenas em nível de arquitetura (opções + trade-offs), sem passo-a-passo. Ver [07](./07-push-notifications.md).

### 3. PWA — `vite-plugin-pwa`

Adotar `vite-plugin-pwa` (Workbox) para gerar o service worker e o manifest de forma controlada, em vez de escrever SW à mão. Detalhes em [06](./06-pwa.md).

## Consequências práticas

- Adicionar dependências: `@supabase/supabase-js`, `@supabase/ssr`, `@tanstack/react-form` (formulários), `rrule` (recorrência), `zod` (validação), `vite-plugin-pwa`; dev: `supabase` (CLI) e `type-fest` (para `MergeDeep`).
- Gerar `src/lib/supabase/database.types.ts` via `supabase gen types` e passar `createClient<Database>`. Script `update-types` no `package.json` para regenerar após cada mudança de schema.
- Substituir `DATABASE_URL` placeholder pela connection string do Supabase (para o **Drizzle** nas migrations) e adicionar `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (runtime) e `SUPABASE_SERVICE_ROLE_KEY` (só server).
- Remover a tabela `todos` placeholder ao introduzir o schema real (9 entidades: `profiles`, `categories`, `tasks`, `task_overrides`, `task_completions`, `goals`, `goal_tasks`, `push_subscriptions`, `notification_logs` — ver [03](./03-modelo-de-dados.md)).
- **Manter o Drizzle** como toolchain única de schema/migrations + `pgPolicy` (RLS); o runtime continua no Supabase client.
- Manter o padrão SSR já existente: loaders acessam o `QueryClient` via contexto do router; queries de dados passam a usar o Supabase client server-side.

> Segurança: o `.env.local` atual contém um `DATABASE_PASSWORD` real em texto. Ver a nota em [05 — Autenticação e RLS](./05-autenticacao-e-rls.md#nota-de-segurança).

> Próximo: [02 — Arquitetura de pastas](./02-arquitetura-de-pastas.md)
