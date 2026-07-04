# 07 — Push notifications

> **Nível de detalhe:** visão de arquitetura, opções e trade-offs. **Sem passo-a-passo** — a implementação é a última fase e opcional. Este doc serve para não travar decisões cedo e para reservar espaço no modelo de dados.

## Objetivo

Lembrar o usuário de tarefas na hora certa, mesmo com o app fechado — ex.: notificar "Escovar os dentes" às 08:00. Requer três peças: uma **inscrição** (subscription) por dispositivo, **armazenamento** dessa inscrição e um **disparador** que envia a notificação no momento certo.

## Pré-requisitos (dependem de outras fases)

- **Service worker ativo** (ver [06 — PWA](./06-pwa.md)): push web só funciona com SW.
- **PWA instalada no iOS** e **iOS 16.4+**: no iPhone, push só chega se o app foi "Adicionado à Tela de Início". Na aba do Safari, não há push.
- Tabela **`push_subscriptions`** já prevista em [03](./03-modelo-de-dados.md).

## Opções de arquitetura

### A) Web Push nativo (VAPID) — recomendado como base

- Padrão aberto (Web Push Protocol + chaves VAPID), sem serviço de terceiros.
- Fluxo: o browser gera uma `PushSubscription` (endpoint + chaves `p256dh`/`auth`) → salva em `push_subscriptions` → um backend envia mensagens assinadas com a chave VAPID → o SW recebe e mostra a notificação.
- **Prós:** sem custo/vendor lock-in; controle total; suportado por Chrome/Firefox/Edge e Safari (com as ressalvas de iOS).
- **Contras:** você é responsável pelo agendamento e pelo envio.

### B) Serviço gerenciado (OneSignal, Firebase Cloud Messaging, etc.)

- Terceiro cuida de entrega, segmentação e, às vezes, agendamento.
- **Prós:** menos infra própria; dashboards prontos.
- **Contras:** SDK/vendor a mais; dados de inscrição em terceiro; ainda precisa mapear "que tarefa dispara quando".

> Recomendação: começar por **A (Web Push/VAPID)**, que casa com Supabase e não adiciona vendor. Migrar para B só se a operação de envio virar gargalo.

## Onde disparar (o agendador)

O ponto difícil não é enviar — é decidir **quando**. Como as ocorrências são calculadas dinamicamente (ver [04](./04-motor-de-recorrencia.md)), não há "linha futura" para consultar. Opções:

1. **Supabase Edge Function + `pg_cron` (agendado):** um job periódico (ex.: a cada minuto/5min) roda uma Edge Function que:
   - expande as ocorrências da janela imediata para todos os usuários (usando o mesmo motor de recorrência),
   - filtra as que têm horário próximo e ainda não notificadas,
   - envia o Web Push para as `push_subscriptions` do usuário.
   - Usa `SERVICE_ROLE_KEY` (só server) para ler entre usuários.
2. **Cron externo** (GitHub Actions, worker próprio) chamando um endpoint de envio — mesma lógica, fora do Supabase.

Ambos precisam de uma noção de **idempotência** (não notificar a mesma ocorrência duas vezes) — ex.: uma tabela/coluna de "notificado em" por `(task_id, occurrence_date)`, ou dedupe por janela.

## Modelo de dados envolvido

- `push_subscriptions` (já em [03](./03-modelo-de-dados.md)): uma linha por dispositivo/navegador do usuário. Remover no logout/expiração.
- `notification_logs` (já em [03](./03-modelo-de-dados.md)): registro de "notificação enviada" por `(task_id, occurrence_date, reminder_key)`, garantindo **idempotência** (não notificar duas vezes o mesmo lembrete).
- Possível acréscimo: preferências de lembrete por task (ex.: "avisar 10 min antes") — fora do escopo inicial.

## Trade-offs e riscos a considerar depois

- **iOS é o limitante:** exige 16.4+, app instalado, e a permissão precisa ser pedida a partir de um gesto do usuário. Desenhar um onboarding claro de permissão.
- **Precisão do horário:** um cron de 1 minuto dá granularidade de minuto — suficiente para lembretes; não use para timing crítico.
- **Fuso-horário:** o disparo deve resolver `time_of_day` no `timezone` da task, não no do servidor.
- **Escala:** por ser single-user por conta e uso pessoal, o volume é baixo — o cron simples resolve bem no início.
- **Permissão negada / inscrição expirada:** tratar limpeza de `push_subscriptions` inválidas (endpoints retornam 404/410).

## Decisão para agora

Nada a implementar. Reservado: a tabela `push_subscriptions` no schema e o service worker (da fase PWA). A escolha final entre **pg_cron + Edge Function** vs. **cron externo** fica para a Fase 9, quando o core estiver estável.

> Próximo: [08 — Roadmap de implementação](./08-roadmap-de-implementacao.md)
