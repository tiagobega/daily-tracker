# 05 — Autenticação e RLS

## Objetivo

Autenticação via **Supabase Auth**, com sessão propagada no SSR do TanStack Start, e **isolamento de dados por usuário aplicado no banco** via Row Level Security. A aplicação nunca é a única linha de defesa: mesmo que um bug de front vaze uma query, o Postgres recusa dados de outro usuário.

## Clients Supabase (dois contextos)

Usar `@supabase/ssr`, que gerencia a sessão via **cookies** — essencial para SSR.

### `src/lib/supabase/server.ts` — server client

- `createServerClient<Database>` lendo/escrevendo cookies do request atual.
- Usado dentro de **server functions** (`createServerFn`) e loaders. Como carrega o JWT do usuário, **toda query respeita a RLS**.
- É o caminho padrão para servir dados.

### `src/lib/supabase/client.ts` — browser client

- `createBrowserClient<Database>` para interações no cliente (ex.: iniciar login, escutar mudanças de auth).
- Também respeita RLS (usa o mesmo JWT).

> Ambos são tipados com `Database` (de `database.types.ts`, gerado pelo `supabase gen types`), tornando `.from().select()` type-safe. Ver o fluxo de tipagem em [01](./01-diagnostico-e-stack.md).

> Chaves: `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` são públicas (o prefixo `VITE_` é necessário para o browser client enxergá-las; a anon key é pública por design, protegida pela RLS). `SUPABASE_SERVICE_ROLE_KEY` é **secreta, só server**, e bypassa RLS — reservada a rotinas administrativas (ex.: push). Nunca expor ao browser nem usar para servir dados de usuário.

## Fluxo de autenticação

Método adotado na Fase 1: **e-mail + senha** (mais simples de testar; sem entrega de e-mail nem provedor externo). Magic link/OAuth ficam para depois — quando entrarem, a rota `/callback` (troca de `code` PKCE por sessão) será adicionada.

1. **Cadastro/Login** (`/login`): `supabase.auth.signUp` / `signInWithPassword` via browser client; os cookies de sessão são gravados.
2. **Sessão no SSR:** o server client lê os cookies em cada request; loaders sabem quem é o usuário.
3. **Logout:** `supabase.auth.signOut()` limpa os cookies.
4. **`/callback` (futuro):** reservada para magic link/OAuth; não usada com e-mail + senha.

## Guarda de rota

Layout autenticado `src/routes/_app/route.tsx` com `beforeLoad`:

- Obtém a sessão via server client.
- Se **não houver** sessão → `redirect` para `/login`.
- Se houver → segue; o `user.id` fica disponível no contexto para as rotas filhas.

Rotas públicas ficam no grupo `(auth)` fora de `_app`, sem a guarda.

## RLS — policies

Ativar RLS em todas as tabelas de domínio e aplicar a policy padrão baseada em `auth.uid()` (o `sub` do JWT = `id` do usuário em `auth.users`).

### Padrão por tabela (conceito SQL)

```sql
alter table categories enable row level security;

create policy "own rows - select"
  on categories for select
  using (auth.uid() = user_id);

create policy "own rows - insert"
  on categories for insert
  with check (auth.uid() = user_id);

create policy "own rows - update"
  on categories for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "own rows - delete"
  on categories for delete
  using (auth.uid() = user_id);
```

O mesmo padrão vale para `goals`, `tasks`, `task_overrides`, `task_completions`, `push_subscriptions` — cada uma comparando `auth.uid() = user_id`. (Por isso overrides e completions carregam `user_id` próprio: policy direta, sem subquery.)

### Declarando no Drizzle

Drizzle suporta RLS via `pgPolicy` e `.enableRLS()` no `src/db/schema.ts`, então as policies nascem das migrations (uma só toolchain de schema). Padrão por tabela:

```ts
// esboço — a task carrega user_id; policy compara com auth.uid()
export const categories = pgTable(
  "categories",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    // ...
  },
  (t) => [
    pgPolicy("own_select", {
      for: "select",
      using: sql`auth.uid() = ${t.userId}`,
    }),
    pgPolicy("own_insert", {
      for: "insert",
      withCheck: sql`auth.uid() = ${t.userId}`,
    }),
    pgPolicy("own_update", {
      for: "update",
      using: sql`auth.uid() = ${t.userId}`,
      withCheck: sql`auth.uid() = ${t.userId}`,
    }),
    pgPolicy("own_delete", {
      for: "delete",
      using: sql`auth.uid() = ${t.userId}`,
    }),
  ],
).enableRLS();
```

> Confirmar a sintaxe exata de `pgPolicy` na versão do `drizzle-orm` do projeto ao implementar a Fase 1 (a API evoluiu entre versões).

## Preenchendo `user_id`

- Nos inserts, `user_id` vem de `auth.uid()` — pode ser default no banco (`default auth.uid()`) ou setado explicitamente na server function a partir da sessão. Preferir `default auth.uid()` na coluna para reduzir chance de erro, com `WITH CHECK` garantindo consistência.

## Nota de segurança

O `.env.local` atual do repositório contém um `DATABASE_PASSWORD` real em texto puro. Ao migrar para o Supabase:

- **Rotacionar** essa credencial (considerá-la comprometida por ter ficado em arquivo local).
- Confirmar que `.env.local` está no `.gitignore` (está — via `*.local`).
- Separar claramente as variáveis:
  - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` → públicas (client + server; prefixo `VITE_` para exposição no browser).
  - `SUPABASE_SERVICE_ROLE_KEY` → **secreta, só server** (sem prefixo `VITE_`, para não vazar no bundle).
  - `DATABASE_URL` (connection string do Supabase) → só para `drizzle-kit` (migrations), fora do runtime da aplicação.

> Próximo: [06 — PWA](./06-pwa.md)
