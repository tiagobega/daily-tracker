# 08 — Roadmap de implementação

Sequência de fases pensada para **entregar valor cedo e evitar retrabalho**: fundação → auth → banco+RLS → CRUD simples → recorrência → exceções → visualizações → objetivos → PWA → push. Cada fase tem objetivo, entregas, critério de "pronto" e dependências. **Cada fase é autorizada separadamente antes de começar.**

> As Fases 1–3 refletem os specs já definidos com o usuário. As Fases 4+ são a continuação lógica (numeração a confirmar). Verificação de cada fase: ver [09 — Plano de testes](./09-plano-de-testes.md).

---

## Fase 0 — Fundações (prep)

**Objetivo:** preparar o terreno sem escrever features.

- Remover boilerplate: tabela `todos` ([src/db/schema.ts](../src/db/schema.ts)) e a rota `/` de exemplo.
- Instalar dependências: `@supabase/supabase-js`, `@supabase/ssr`, `rrule`, `zod`, `vite-plugin-pwa`. **Manter Drizzle** (schema + migrations). Dev: `supabase` (CLI), `type-fest`.
- `npx supabase login` + `npx supabase init` (alvo de dev = **projeto remoto**, via `--project-id`).
- Variáveis de ambiente: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (runtime); `SUPABASE_SERVICE_ROLE_KEY` (só server, futuro push); `DATABASE_URL` do Supabase (só `drizzle-kit`). **Rotacionar** a credencial exposta (ver [05](./05-autenticacao-e-rls.md#nota-de-segurança)).
- **Pronto quando:** projeto builda e conecta ao Supabase.
- **Depende de:** —

## Fase 1 — Autenticação (SSR)

**Objetivo:** login/logout com sessão consistente no client e no server. **Sem tabelas/RLS ainda.**

- Clients Supabase: `lib/supabase/client.ts` (browser) e `lib/supabase/server.ts` (server, cookies do request).
- Helper de usuário autenticado no servidor (ex.: `getUser()`).
- Método **e-mail + senha** (sem `/callback`; magic link/OAuth ficam para depois).
- Rota `(auth)/login.tsx` (login/cadastro) + logout.
- Layout autenticado `_app/route.tsx` com guarda (`beforeLoad`) e uma rota protegida de teste.
- `.env.example` sem valores reais.
- **Pronto quando:** cadastrar/logar/deslogar funciona; `_app` exige sessão (redirect `/login`); sessão sobrevive a reload no server e no client.
- **Depende de:** Fase 0.

## Fase 2 — Banco completo + RLS

**Objetivo:** modelar **todas** as entidades de uma vez, com RLS, via Drizzle. (Schema "big-bang".)

- Definir em `src/db/schema.ts` as 9 tabelas de [03](./03-modelo-de-dados.md): `profiles`, `categories`, `tasks`, `task_overrides`, `task_completions`, `goals`, `goal_tasks`, `push_subscriptions`, `notification_logs`.
- **RLS + `pgPolicy`** em todas (`auth.uid() = user_id`; em `profiles`, `= id`). Sem policy pública, sem service role.
- Constraints: `unique(task_id, occurrence_date)` (overrides e completions), `unique(goal_id, task_id)`, `unique(user_id, endpoint)`, `unique(task_id, occurrence_date, reminder_key)`. Checks simples (`priority`, `status`, `target_type`).
- Trigger único `set_updated_at`; trigger de criação de `profiles` a partir de `auth.users`.
- Indexes por `user_id`, datas e `task_id`. `recurrence_rule` como `jsonb`.
- Gerar/aplicar migrations no **projeto remoto** (`drizzle-kit generate` + `push`/`migrate`).
- Gerar tipos: `supabase gen types typescript --project-id <ref> > src/lib/supabase/database.types.ts`; adicionar script `update-types` no `package.json` (rodado à mão após cada mudança de schema). Override do `recurrence_rule` via `MergeDeep` em `lib/supabase/types.ts`.
- **Pronto quando:** migrations aplicam; `database.types.ts` reflete o schema; RLS recusa dados de outro usuário (teste com 2 usuários).
- **Depende de:** Fase 1.

## Fase 3 — CRUD de tasks simples + tela "Hoje"

**Objetivo:** usar o app no dia a dia com tasks **não recorrentes**. (Conclusões antecipadas para cá.)

- `features/tasks/` (`server.ts`, `queries.ts`, `components/`); validação com **Zod**.
- Tela "Hoje" (`_app/today.tsx`): input rápido (só título → task de hoje, `is_recurring = false`), lista do dia, checkbox de conclusão, editar, arquivar.
- Listagem do dia **provisória**: tasks com `starts_on == dia`. _Será substituída pelo motor de expansão na Fase 4._
- Conclusão em `task_completions` por `(task_id, occurrence_date)` — **nunca** alterando a task principal. Desmarcar = deletar a linha.
- Arquivar = `archived_at`.
- **Pronto quando:** criar/listar/editar/arquivar tasks e marcar/desmarcar conclusão do dia, tudo isolado por usuário.
- **Depende de:** Fase 2.

## Fase 4 — Recorrência (motor + visão do dia recorrente)

**Objetivo:** o coração do app.

- `features/tasks/recurrence.ts` (função pura, ver [04](./04-motor-de-recorrencia.md)) + `recurrence.test.ts`; converte `recurrence_rule` (jsonb) → `rrule` e expande a janela.
- Editor de recorrência (jsonb estruturado, validado por Zod) no formulário de task.
- **Substituir** a query provisória da tela "Hoje" pelo motor.
- **Pronto quando:** "todo dia às 08:00" aparece em todos os dias sem persistir ocorrências; testes do motor passam.
- **Depende de:** Fase 3.

## Fase 5 — Overrides por ocorrência

**Objetivo:** exceções pontuais.

- `features/tasks` — edição "só esta ocorrência" gera `task_overrides`; "cancelar este dia" = `is_cancelled`.
- Integração no motor: aplicar override na expansão.
- **Pronto quando:** editar/cancelar uma ocorrência afeta só aquele dia (exemplo "pasta XPTO" funciona).
- **Depende de:** Fase 4.

## Fase 6 — Calendário

**Objetivo:** visão mensal.

- `_app/calendar.tsx` consumindo o motor numa janela de mês; indicadores por dia; navegação entre meses.
- **Pronto quando:** meses mostram ocorrências/overrides corretos; abrir um dia leva à tela "Hoje".
- **Depende de:** Fase 5.

## Fase 7 — Objetivos + progresso

**Objetivo:** metas vinculadas a tarefas com progresso.

- `features/goals/` incl. `progress.ts` (progresso **derivado e ponderado** via `goal_tasks.weight` — ver [03](./03-modelo-de-dados.md)); rotas `_app/goals/`.
- Vínculo M:N: telas para associar tasks a um objetivo com peso.
- **Pronto quando:** criar objetivo, vincular tasks (com peso), ver o progresso reagir às conclusões.
- **Depende de:** Fase 5.

## Fase 8 — PWA completo

**Objetivo:** app instalável de verdade.

- `vite-plugin-pwa`, manifest real, ícones (incl. maskable), service worker, meta tags iOS, fluxo de atualização. Checklist de [06](./06-pwa.md).
- **Pronto quando:** instala no Android e iOS (add-to-home), abre offline (shell), Lighthouse PWA ok.
- **Depende de:** core estável (Fases 1–7).

## Fase 9 — Push notifications (opcional)

**Objetivo:** lembretes.

- `push_subscriptions` + `notification_logs` (idempotência), inscrição via SW, disparador (pg_cron + Edge Function ou cron externo). Ver [07](./07-push-notifications.md).
- **Pronto quando:** lembrete de uma task chega no horário no dispositivo instalado, sem duplicar.
- **Depende de:** Fase 8 (service worker).

---

## Ordem e dependências (resumo)

```
0 ─► 1 ─► 2 ─► 3 ─► 4 ─► 5 ─┬─► 6
                            └─► 7
8 (depois de 1–7)  ─►  9
```

## Princípios do roadmap

- **Segurança primeiro:** RLS entra já na Fase 2, antes de qualquer CRUD real.
- **Vertical slices:** cada fase entrega algo utilizável ponta a ponta.
- **Recorrência isolada e testada** (Fase 4) antes de overrides dependerem dela (Fase 5).
- **Query da tela "Hoje" é provisória** na Fase 3 e trocada pelo motor na Fase 4 — dívida consciente, não escondida.
- **PWA e push por último:** dependem do core e não bloqueiam o uso diário.

> Próximo: [09 — Plano de testes](./09-plano-de-testes.md)
