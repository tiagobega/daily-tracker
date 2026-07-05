# 04 — Motor de recorrência

> **Documento central.** Releia antes de tocar em qualquer coisa de recorrência. A regra de ouro: **ocorrências futuras nunca são persistidas** — só a _task principal_ (definição), os _overrides_ (exceções) e as _conclusões_ moram no banco. O que aparece no dia/calendário é **calculado em runtime**.

## Modelo mental

Três camadas, do mais geral ao mais específico:

1. **Task principal** — a definição base + a regra de recorrência. É o **fallback**: se não houver exceção, a ocorrência é gerada a partir dela.
2. **Override** — sobrescreve **uma** ocorrência específica `(task_id, occurrence_date)`. Pode alterar campos (título, horário...) ou cancelar o dia (`is_cancelled`). _Reagendar para outro dia está fora do MVP (ver [03](./03-modelo-de-dados.md))._
3. **Conclusão (completion)** — registra o status da ocorrência `(task_id, occurrence_date)` (`done`/`skipped`/`partial`). Independente das outras duas.

A ocorrência exibida é: **task principal → aplica override (se existir) → anexa flag de conclusão**.

## Exemplo canônico — "Escovar os dentes"

- **Task principal:** título "Escovar os dentes", `is_recurring = true`, `recurrence_rule = { "freq": "daily" }`, `time_of_day = 08:00`, `timezone = America/Sao_Paulo`.
- Sem overrides, todos os dias mostram "Escovar os dentes" às 08:00.
- O usuário edita **apenas a terça-feira 08/07**: cria um `task_override` com `occurrence_date = 2026-07-08` e `title = "Escovar os dentes com pasta XPTO"`.
- **Resultado:** na terça 08/07 o app mostra o override; nos demais dias, a task original. Nada mais foi persistido — nenhuma outra ocorrência existe como linha.

## Regra de recorrência

Armazenada em `tasks.recurrence_rule` como **objeto `jsonb` estruturado** (mais fácil de montar/validar na UI e de versionar). Um schema próprio, mapeável 1:1 para os campos de RRULE. Exemplos:

| Intenção              | `recurrence_rule` (jsonb)                                       |
| --------------------- | --------------------------------------------------------------- |
| Todo dia              | `{ "freq": "daily" }`                                           |
| Dias úteis            | `{ "freq": "weekly", "byweekday": ["MO","TU","WE","TH","FR"] }` |
| Toda segunda e quinta | `{ "freq": "weekly", "byweekday": ["MO","TH"] }`                |
| A cada 2 dias         | `{ "freq": "daily", "interval": 2 }`                            |
| Todo dia 1 do mês     | `{ "freq": "monthly", "bymonthday": [1] }`                      |
| Com fim de série      | `{ "freq": "daily", "until": "2026-12-31" }`                    |

- **Fim da série** vive **dentro** do jsonb (`until`) — não há coluna `recurrence_end_date`.
- **Expansão:** na hora de expandir, o objeto jsonb é convertido para uma `RRule` e usa-se a lib [`rrule`](https://github.com/jkbrzt/rrule) (`RRule.between(from, to)`). Ou seja, jsonb é só o **formato de armazenamento**; a lib `rrule` continua fazendo o trabalho pesado.
- **Validação e tipo:** um schema **Zod** (`recurrenceRuleSchema`) valida antes de salvar e é a fonte do tipo (`type RecurrenceRule = z.infer<...>`). Como o Supabase gera `recurrence_rule` apenas como `Json`, sobrescreve-se a coluna para `RecurrenceRule` via `MergeDeep` (ver [01](./01-diagnostico-e-stack.md)).
- Tasks pontuais (`is_recurring = false`) têm `recurrence_rule = null` — geram no máximo uma ocorrência em `starts_on`.

## Algoritmo de expansão (função pura)

Vive em `features/tasks/recurrence.ts`, sem dependência de banco nem React. Assinatura conceitual:

```
expandOccurrences({
  tasks,          // tasks ativas do usuário que podem ocorrer na janela
  overrides,      // task_overrides das tasks acima, na janela
  completions,    // task_completions das tasks acima, na janela
  from, to,       // janela de datas [from, to]
  timezone,       // resolução de horário/DST
}) -> Occurrence[]
```

Passos, para a janela `[from, to]`:

1. **Selecionar tasks candidatas.** Ativas (`archived_at IS NULL`), com `starts_on <= to` e (`recurrence_rule.until` ausente ou `>= from`).
2. **Expandir cada task:**
   - Pontual → uma ocorrência em `starts_on` se cair na janela.
   - Recorrente → converter `recurrence_rule` (jsonb) para `RRule` e chamar `RRule.between(from, to)`, com `starts_on` como DTSTART e `recurrence_rule.until` como UNTIL.
3. **Aplicar overrides** por `(task_id, occurrence_date)`:
   - `is_cancelled = true` → manter a ocorrência **marcada** (`isCancelled: true`), não removê-la — a UI mostra numa seção "Canceladas" com opção de restaurar; consumidores (tela do dia, calendário) filtram as canceladas da lista ativa.
   - Campos não-null (`title`, `description`, `time_of_day`, `category_id`) → sobrescrever os da task.
4. **Anexar status:** se existir `task_completion` para `(task_id, occurrence_date)`, anexar seu `status` (`done`/`skipped`/`partial`); senão, pendente.
5. **Emitir view models** de ocorrência e ordenar por horário:

```
Occurrence = {
  taskId,
  occurrenceDate,        // data local (chave da ocorrência)
  effectiveTitle,        // override.title ?? task.title
  effectiveDescription,
  effectiveTime,         // override.time_of_day ?? task.time_of_day
  categoryId,            // override.category_id ?? task.category_id
  status,                // 'done' | 'skipped' | 'partial' | null (pendente)
  isOverride,            // houve override aplicado?
  isCancelled,           // override cancelou este dia (filtrar da lista ativa)
  isRecurring,
}
```

> Objetivos não entram no view model da ocorrência: o vínculo task↔goal é M:N (`goal_tasks`) e o progresso é calculado à parte (ver [03](./03-modelo-de-dados.md)).

> **Identidade da ocorrência = `(task_id, occurrence_date)`.** Essa dupla é a chave que liga expansão, overrides e conclusões. `occurrence_date` é sempre **data local** (não timestamp) para o "dia" ser estável.

## Fluxo de dados (dia e calendário)

- **Visão do dia (`/today`):** janela `[hoje, hoje]` no timezone do usuário.
- **Calendário:** janela `[primeiro dia visível, último dia visível]` (ex.: mês).
- As server functions buscam tasks/overrides/completions da janela via Supabase (RLS aplicada) e passam ao motor puro. O resultado vai para o TanStack Query (`features/tasks/queries.ts`), com `queryKey` incluindo o range.

## Operações de edição

| Ação do usuário                   | Efeito no banco                                                     |
| --------------------------------- | ------------------------------------------------------------------- |
| Criar tarefa                      | insert em `tasks`                                                   |
| Concluir um dia                   | upsert em `task_completions` (`status = 'done'`) por `(task, data)` |
| Desmarcar um dia                  | **delete** da linha em `task_completions`                           |
| Pular/parcial um dia              | upsert em `task_completions` com `status = 'skipped'`/`'partial'`   |
| Editar **só esta ocorrência**     | upsert em `task_overrides` por `(task, data)`                       |
| Cancelar **só este dia**          | upsert override com `is_cancelled = true`                           |
| Editar **a task inteira / todas** | update em `tasks` (não toca overrides existentes)                   |
| Excluir a task                    | delete em `tasks` (CASCADE em overrides/completions)                |

> **"Esta e as próximas ocorrências"** (dividir a série) fica **fora do MVP**. Quando necessário: encerrar a série atual (`recurrence_rule.until` = véspera) e criar uma nova task a partir da data. Documentar como evolução futura.

## Cuidados com fuso-horário / DST

- Guardar o `timezone` (IANA) na task; nunca depender do fuso do dispositivo em tempo de leitura.
- Comparar sempre por **data local** (`occurrence_date`), não por instante UTC, para não "pular" ou "duplicar" um dia perto da meia-noite.
- Ao expandir com `rrule`, tratar as datas como "wall-clock" no timezone da task e converter para exibição — evita bugs em transições de horário de verão.
- `time_of_day` é o horário local previsto; a conversão para o momento absoluto (ex.: agendar push) acontece só quando necessário, no timezone da task.

## Por que essa arquitetura

- **Banco enxuto:** uma série de 5 anos = 1 linha em `tasks`, não ~1825 linhas.
- **Edição barata e localizada:** exceções custam 1 linha de override; a definição base nunca é duplicada.
- **Histórico confiável:** conclusões são independentes de edições — mudar o título de hoje não apaga o que já foi concluído.
- **Testável:** o motor é uma função pura → testes de unidade cobrem recorrência, override e DST sem banco (ver [09](./09-plano-de-testes.md)).

> Próximo: [05 — Autenticação e RLS](./05-autenticacao-e-rls.md)
