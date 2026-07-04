# 03 — Modelo de dados

Postgres gerenciado pelo Supabase. Schema definido em **Drizzle** (`src/db/schema.ts`) com **RLS e policies via `pgPolicy`**; `drizzle-kit` gera/aplica as migrations (ver [01](./01-diagnostico-e-stack.md) e [05](./05-autenticacao-e-rls.md)). **Todas** as tabelas de dados do usuário têm `user_id uuid` referenciando `auth.users(id)` e **RLS ativada**.

> Convenções de nome adotadas: **`categories`** (não "niches"), **`starts_on`** para a data inicial, **`occurrence_date`** para a data da ocorrência. O fim de uma série recorrente vive **dentro** de `recurrence_rule` (jsonb, campo `until`) — não há coluna separada.

## Diagrama textual

```
auth.users (Supabase)
    │ 1─1
    ├── profiles
    │
    │ 1─N
    ├── categories
    │       │ 1─N (opcional)
    │       ▼
    ├── tasks ──1─N──► task_overrides       (exceção por data)
    │     │  └─1─N──► task_completions      (conclusão por data)
    │     │
    │     │            goals
    │     │              │
    │     └──── goal_tasks (M:N, com weight) ──┘   (alimenta progresso ponderado)
    │
    ├── push_subscriptions      (fase final)
    └── notification_logs       (idempotência de push)
```

## Tabelas

### `profiles`

Espelho 1‑para‑1 de `auth.users`, para dados de perfil e o **timezone padrão** do usuário.

| Coluna       | Tipo          | Notas                                             |
| ------------ | ------------- | ------------------------------------------------- |
| `id`         | `uuid` PK     | **referencia** `auth.users(id)` ON DELETE CASCADE |
| `name`       | `text`        |                                                   |
| `timezone`   | `text`        | IANA tz padrão (ex.: `America/Sao_Paulo`)         |
| `created_at` | `timestamptz` | `default now()`                                   |

> Criar via trigger `on auth.users insert` (função que insere o profile) ou no primeiro login. RLS: `auth.uid() = id`.

### `categories` (nichos)

| Coluna       | Tipo            | Notas                       |
| ------------ | --------------- | --------------------------- |
| `id`         | `uuid` PK       | `default gen_random_uuid()` |
| `user_id`    | `uuid` NOT NULL | FK `auth.users(id)` CASCADE |
| `name`       | `text` NOT NULL |                             |
| `color`      | `text`          | hex ou token                |
| `icon`       | `text`          | nome de ícone lucide        |
| `created_at` | `timestamptz`   | `default now()`             |
| `updated_at` | `timestamptz`   | `default now()` (trigger)   |

Índice: `(user_id)`.

### `tasks` (task principal)

| Coluna              | Tipo               | Notas                                                                                             |
| ------------------- | ------------------ | ------------------------------------------------------------------------------------------------- |
| `id`                | `uuid` PK          |                                                                                                   |
| `user_id`           | `uuid` NOT NULL    | FK `auth.users(id)` CASCADE                                                                       |
| `category_id`       | `uuid`             | FK `categories(id)` ON DELETE SET NULL                                                            |
| `title`             | `text` NOT NULL    |                                                                                                   |
| `description`       | `text`             |                                                                                                   |
| `starts_on`         | `date` NOT NULL    | primeira data da tarefa/série                                                                     |
| `time_of_day`       | `time`             | horário previsto; null = dia todo                                                                 |
| `timezone`          | `text` NOT NULL    | IANA tz (default = `profiles.timezone`)                                                           |
| `is_recurring`      | `boolean` NOT NULL | default `false`                                                                                   |
| `recurrence_rule`   | `jsonb`            | regra estruturada quando `is_recurring`; null se pontual (ver [04](./04-motor-de-recorrencia.md)) |
| `priority`          | `text`             | ex.: `low` \| `medium` \| `high` (check)                                                          |
| `estimated_minutes` | `integer`          | duração estimada, opcional                                                                        |
| `archived_at`       | `timestamptz`      | soft-delete; null = ativa                                                                         |
| `created_at`        | `timestamptz`      | `default now()`                                                                                   |
| `updated_at`        | `timestamptz`      | `default now()` (trigger)                                                                         |

Índices: `(user_id)`, `(user_id, starts_on)`, `(category_id)`.

> Sem coluna `goal_id`: o vínculo com objetivos é **M:N** via `goal_tasks`. O fim da recorrência é `recurrence_rule.until` (jsonb).

### `task_overrides` (exceção de uma ocorrência)

| Coluna            | Tipo               | Notas                                                 |
| ----------------- | ------------------ | ----------------------------------------------------- |
| `id`              | `uuid` PK          |                                                       |
| `user_id`         | `uuid` NOT NULL    | FK `auth.users(id)` CASCADE                           |
| `task_id`         | `uuid` NOT NULL    | FK `tasks(id)` ON DELETE CASCADE                      |
| `occurrence_date` | `date` NOT NULL    | data (local) da ocorrência alvo                       |
| `title`           | `text`             | sobrescreve se não-null                               |
| `description`     | `text`             | sobrescreve se não-null                               |
| `time_of_day`     | `time`             | sobrescreve se não-null                               |
| `category_id`     | `uuid`             | FK `categories(id)` SET NULL; sobrescreve se não-null |
| `is_cancelled`    | `boolean` NOT NULL | default `false`; `true` = ocorrência não aparece      |
| `created_at`      | `timestamptz`      | `default now()`                                       |
| `updated_at`      | `timestamptz`      | `default now()` (trigger)                             |

**Unicidade:** `UNIQUE (task_id, occurrence_date)`. Índice: `(task_id, occurrence_date)`.

> Reagendamento de ocorrência (mover para outro dia) fica **fora do MVP** — não há `rescheduled_date`. Quando necessário: cancelar o dia (override `is_cancelled`) e criar uma task pontual na nova data.

### `task_completions` (conclusão / status por dia)

| Coluna            | Tipo            | Notas                                                    |
| ----------------- | --------------- | -------------------------------------------------------- |
| `id`              | `uuid` PK       |                                                          |
| `user_id`         | `uuid` NOT NULL | FK `auth.users(id)` CASCADE                              |
| `task_id`         | `uuid` NOT NULL | FK `tasks(id)` ON DELETE CASCADE                         |
| `occurrence_date` | `date` NOT NULL | dia (local)                                              |
| `status`          | `text` NOT NULL | `done` \| `skipped` \| `partial` (check); default `done` |
| `completed_at`    | `timestamptz`   | quando marcada como `done`; null para outros status      |
| `notes`           | `text`          | anotação opcional do dia                                 |
| `created_at`      | `timestamptz`   | `default now()`                                          |

**Unicidade:** `UNIQUE (task_id, occurrence_date)`. Índice: `(task_id, occurrence_date)`, `(user_id, occurrence_date)`.

> Semântica: "**concluído**" = existe linha com `status = 'done'`. "**Desmarcar**" = **deletar a linha** (volta a pendente). `skipped`/`partial` são status explícitos, distintos de `override.is_cancelled` (que remove a ocorrência do calendário). Ver [04](./04-motor-de-recorrencia.md).

### `goals` (objetivos)

| Coluna         | Tipo            | Notas                                            |
| -------------- | --------------- | ------------------------------------------------ |
| `id`           | `uuid` PK       |                                                  |
| `user_id`      | `uuid` NOT NULL | FK `auth.users(id)` CASCADE                      |
| `title`        | `text` NOT NULL |                                                  |
| `description`  | `text`          |                                                  |
| `target_type`  | `text` NOT NULL | ex.: `count` \| `streak` \| `minutes` (check)    |
| `target_value` | `numeric`       | meta numérica (ex.: 30)                          |
| `period`       | `text`          | ex.: `daily` \| `weekly` \| `monthly` \| `total` |
| `starts_on`    | `date`          | início do horizonte                              |
| `ends_on`      | `date`          | fim do horizonte                                 |
| `archived_at`  | `timestamptz`   | soft-delete                                      |
| `created_at`   | `timestamptz`   | `default now()`                                  |
| `updated_at`   | `timestamptz`   | `default now()` (trigger)                        |

Índice: `(user_id)`. Progresso é **derivado** e **ponderado** (ver seção abaixo e `progress.ts` em [02](./02-arquitetura-de-pastas.md)).

### `goal_tasks` (vínculo objetivo ↔ task, M:N)

| Coluna       | Tipo               | Notas                                              |
| ------------ | ------------------ | -------------------------------------------------- |
| `id`         | `uuid` PK          |                                                    |
| `user_id`    | `uuid` NOT NULL    | FK `auth.users(id)` CASCADE                        |
| `goal_id`    | `uuid` NOT NULL    | FK `goals(id)` ON DELETE CASCADE                   |
| `task_id`    | `uuid` NOT NULL    | FK `tasks(id)` ON DELETE CASCADE                   |
| `weight`     | `numeric` NOT NULL | default `1`; peso da task no progresso do objetivo |
| `created_at` | `timestamptz`      | `default now()`                                    |

**Unicidade:** `UNIQUE (goal_id, task_id)`. Índices: `(goal_id)`, `(task_id)`.

### `push_subscriptions` (fase final — ver [07](./07-push-notifications.md))

| Coluna       | Tipo            | Notas                              |
| ------------ | --------------- | ---------------------------------- |
| `id`         | `uuid` PK       |                                    |
| `user_id`    | `uuid` NOT NULL | FK `auth.users(id)` CASCADE        |
| `endpoint`   | `text` NOT NULL | endpoint do Web Push               |
| `p256dh`     | `text` NOT NULL | chave pública do cliente           |
| `auth`       | `text` NOT NULL | segredo de autenticação            |
| `user_agent` | `text`          | identifica o dispositivo, opcional |
| `created_at` | `timestamptz`   | `default now()`                    |

**Unicidade:** `UNIQUE (user_id, endpoint)`.

### `notification_logs` (idempotência de push — ver [07](./07-push-notifications.md))

| Coluna            | Tipo                   | Notas                                          |
| ----------------- | ---------------------- | ---------------------------------------------- |
| `id`              | `uuid` PK              |                                                |
| `user_id`         | `uuid` NOT NULL        | FK `auth.users(id)` CASCADE                    |
| `task_id`         | `uuid` NOT NULL        | FK `tasks(id)` ON DELETE CASCADE               |
| `occurrence_date` | `date` NOT NULL        | ocorrência notificada                          |
| `reminder_key`    | `text` NOT NULL        | qual lembrete (ex.: `at_time`, `10min_before`) |
| `sent_at`         | `timestamptz` NOT NULL | `default now()`                                |

**Unicidade:** `UNIQUE (task_id, occurrence_date, reminder_key)` — garante que o mesmo lembrete não é enviado duas vezes.

## RLS (resumo)

- RLS **habilitada** em todas as tabelas acima.
- Policy padrão por tabela: `USING (auth.uid() = user_id)` e `WITH CHECK (auth.uid() = user_id)` para select/insert/update/delete. Em `profiles`, comparar `auth.uid() = id`.
- Todas as tabelas filhas (overrides, completions, goal_tasks, notification_logs) carregam `user_id` próprio → policy direta, sem subquery. Detalhes e `pgPolicy` no Drizzle em [05](./05-autenticacao-e-rls.md).

## `updated_at` (trigger)

Para as tabelas com `updated_at` (`categories`, `tasks`, `task_overrides`, `goals`), usar **um único trigger** `set_updated_at` (função `BEFORE UPDATE` que faz `NEW.updated_at = now()`), aplicado a cada tabela. Evita repetir lógica na aplicação.

## Progresso de objetivo (derivado e ponderado)

Progresso calculado a partir das `task_completions` (`status = 'done'`) das tasks vinculadas via `goal_tasks`, aplicando o `weight` de cada vínculo, dentro do horizonte (`goals.starts_on..ends_on`) e respeitando `period`:

```
progresso = Σ (completions_done(task) no horizonte × goal_tasks.weight)
percentual = min(100, progresso / goals.target_value × 100)
```

- **Derivado:** sempre consistente com o histórico; nada para sincronizar.
- Cálculo isolado em `features/goals/progress.ts` (puro, testável).

## Notas de integridade

- Deletar uma task **cascateia** overrides, completions, goal_tasks e notification_logs.
- Deletar uma categoria **não** apaga tasks (SET NULL no vínculo).
- Deletar um goal cascateia só os `goal_tasks` (as tasks permanecem).
- `archived_at` em `tasks`/`goals` oculta sem perder histórico.

> Próximo: [04 — Motor de recorrência](./04-motor-de-recorrencia.md)
