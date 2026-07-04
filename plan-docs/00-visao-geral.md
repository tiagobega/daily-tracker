# 00 — Visão geral

## O que é

O **Daily Tracker** é um app pessoal de acompanhamento diário de tarefas. O usuário cadastra tarefas (pontuais ou recorrentes), organiza-as por categorias/nichos, marca conclusões dia a dia, acompanha o cumprimento em uma visão de calendário e vincula tarefas a objetivos com progresso mensurável. Lembretes chegam via push notifications.

É um produto **single-user por conta**: cada usuário enxerga e manipula apenas os próprios dados — garantido no banco por Row Level Security (RLS), não apenas na aplicação.

## Para quem

Uso pessoal / produtividade. Público-alvo primário: o próprio usuário no celular, ao longo do dia. Por isso o app é **mobile-first** e **instalável como PWA** na tela inicial do telefone.

## Objetivos do produto

1. **Ver o que fazer hoje** em segundos ao abrir o app (`/today`).
2. **Registrar recorrência sem esforço** — "todos os dias às 08:00" é uma tarefa só, não 365 tarefas.
3. **Ajustar exceções pontuais** — mudar uma única ocorrência sem afetar as demais.
4. **Manter histórico de conclusões** confiável por dia.
5. **Enxergar progresso** de objetivos de longo prazo alimentado pelas conclusões.
6. **Lembrar o usuário** na hora certa via notificações.

## Escopo

### MVP (o que entra primeiro)

- Autenticação (login/logout) via Supabase.
- CRUD de categorias/nichos.
- CRUD de tarefas pontuais e recorrentes.
- Visão do dia com marcação de conclusão.
- Motor de recorrência dinâmico (ocorrências calculadas, não persistidas).
- Override de ocorrência específica.
- Visão de calendário.
- Objetivos vinculados a tarefas + progresso.

### Futuro (fora do MVP inicial)

- Push notifications (planejadas, mas implementadas por último — ver [07](./07-push-notifications.md)).
- Edição "esta e as próximas ocorrências" (split de série).
- Modo offline com escrita (fila de sincronização).
- Compartilhamento entre usuários / tarefas colaborativas.
- Estatísticas avançadas / streaks.

## Princípios de produto

- **Mobile-first.** Layout e interações pensados para o polegar; desktop é secundário.
- **Instalável e leve.** PWA com carregamento rápido; funciona bem em conexões ruins.
- **Dono dos próprios dados.** Isolamento por usuário aplicado no banco (RLS), não confiando só no front.
- **Recorrência sem inchar o banco.** Ocorrências futuras são calculadas em tempo real; só exceções (overrides) e conclusões são persistidas.
- **Fonte da verdade única.** A "task principal" é o fallback; overrides e conclusões apenas complementam ocorrências específicas.
- **Fuso-horário explícito.** Cada tarefa carrega o timezone em que foi agendada, para o "dia" e o horário serem estáveis.

## Conceitos-chave (glossário)

- **Task principal** — a definição base de uma tarefa (título, horário, regra de recorrência).
- **Ocorrência** — uma instância da task em uma data específica; identificada por `(task_id, occurrence_date)`. Nunca é persistida por si só quando futura.
- **Override** — sobrescrita de uma ocorrência específica (ex.: mudar o título só naquele dia, ou cancelar o dia).
- **Conclusão (completion)** — registro de que uma ocorrência foi concluída, salvo por `(task_id, occurrence_date)`.
- **Categoria / nicho** — agrupamento das tarefas (ex.: Saúde, Trabalho, Estudos).
- **Objetivo (goal)** — meta de longo prazo, cujo progresso é alimentado por conclusões de tarefas vinculadas.

> Próximo: [01 — Diagnóstico e stack](./01-diagnostico-e-stack.md)
