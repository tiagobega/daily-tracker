# 09 — Plano de testes

Estratégia de verificação por fase. Ferramentas já presentes: **Vitest** (jsdom + Testing Library) e **Biome** (`npm run check`). O foco de teste automatizado é o **motor de recorrência** (lógica pura, alto risco); o resto combina testes leves + verificação manual guiada por checklist.

## Pirâmide de teste (o que priorizar)

1. **Unidade — motor de recorrência** (maior ROI): função pura, sem banco.
2. **Unidade — progresso de objetivo:** cálculo puro sobre conclusões.
3. **Integração — RLS:** garantir isolamento entre usuários no banco.
4. **Componentes:** formulários/ações críticas (toggle de conclusão, editor de recorrência).
5. **Manual/checklist:** auth, calendário, PWA/instalação.

## Por fase

### Fase 0 — Fundações

- `npm run build` completa; `npm run check` limpo.
- App conecta ao Supabase (smoke test de client).

### Fase 1 — Auth + RLS

- **Manual:** login → acesso a `_app`; logout → redirect para `/login`; acessar `_app` sem sessão redireciona.
- **Integração RLS:** com dois usuários de teste, garantir que o usuário A **não** lê/edita linhas do usuário B (teste falha se a RLS estiver desligada). Rodar contra um banco de teste/local.

### Fase 2 — Categorias

- **Componentes/integração:** CRUD cria/edita/exclui e reflete só nos dados do usuário logado.

### Fase 3 — Tarefas pontuais

- CRUD de task pontual; aparece na visão do dia correspondente ao `start_date`/timezone.

### Fase 4 — Recorrência (cobertura forte)

Testes de unidade em `features/tasks/recurrence.test.ts`, sem banco:

- **Diária:** `{ freq: "daily" }` em janela de 7 dias → 7 ocorrências.
- **Semanal por dia:** `{ freq: "weekly", byweekday: ["MO","TH"] }` → só segundas e quintas na janela.
- **Intervalo:** `{ freq: "daily", interval: 2 }` → dias alternados.
- **Limites:** respeita `starts_on` (DTSTART) e `recurrence_rule.until` (UNTIL).
- **Pontual:** `is_recurring = false` → no máximo 1 ocorrência, em `starts_on`.
- **Janela vazia:** nenhuma ocorrência fora do range.
- **DST/timezone:** ocorrência perto da meia-noite e em transição de horário de verão não duplica nem some; `occurrence_date` estável no `timezone` da task.

### Fase 5 — Overrides + conclusões

Estender os testes do motor:

- **Override de campo:** título muda só na `occurrence_date` alvo; demais dias intactos (caso "pasta XPTO").
- **Cancelamento:** `is_cancelled = true` remove a ocorrência daquele dia.
- **Reagendamento:** `rescheduled_date` move a ocorrência e reavalia a janela.
- **Conclusão:** `completed = true` só quando existe `task_completion` para `(task, data)`; desmarcar remove.
- **Independência:** editar a task depois de concluir um dia não apaga a conclusão.

### Fase 6 — Calendário

- **Manual:** navegar meses mostra ocorrências/overrides corretos; indicadores de concluído/pendente batem com a visão do dia.

### Fase 7 — Objetivos + progresso

- **Unidade `progress.ts`:** progresso = contagem de conclusões das tasks vinculadas dentro do horizonte; percentual limitado a 100; muda ao concluir/desmarcar.
- **Manual:** vincular task a objetivo e ver o progresso reagir.

### Fase 8 — PWA

Checklist manual (de [06](./06-pwa.md)) em **dispositivo real**:

- [ ] Instala no Android (prompt) e iOS (add-to-home).
- [ ] Abre offline (app shell via SW).
- [ ] Manifest/ícones/`theme-color`/meta iOS presentes.
- [ ] Fluxo de atualização do SW funciona.
- [ ] Lighthouse PWA sem erros críticos.

### Fase 9 — Push (opcional)

- **Manual:** conceder permissão → inscrição salva em `push_subscriptions`; um lembrete de task chega no horário no dispositivo instalado; idempotência (não duplica); limpeza de inscrição inválida.

## Comandos

```bash
npm run test                 # Vitest (roda uma vez)
npx vitest run <arquivo>     # um arquivo específico
npx vitest -t "<nome>"       # por nome de teste
npm run check                # Biome (lint + format + imports) — gate antes de finalizar
npm run build                # valida build de produção
```

## Princípios

- **Motor puro = testes puros:** manter `recurrence.ts` e `progress.ts` sem I/O torna a lógica crítica testável e rápida.
- **RLS é teste, não fé:** validar isolamento com dois usuários — a regressão mais perigosa é silenciosa.
- **PWA/push são de device:** emulador não substitui iPhone real, sobretudo por causa dos limites de iOS.
- **`npm run check` antes de fechar cada fase.**

> Fim da documentação de planejamento. Voltar ao [índice](./README.md).
