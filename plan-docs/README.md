# Plano de construção — Daily Tracker

Documentação de planejamento passo a passo para construir o **Daily Tracker**: um rastreador diário de tarefas, PWA instalável, com autenticação Supabase + Row Level Security, tarefas recorrentes com override por ocorrência, conclusões por dia, categorias, objetivos e push notifications.

> Estes documentos descrevem **o que** e **por que** construir, e em **que ordem**. Nenhum código de aplicação foi escrito ainda — a implementação será feita por fases, com autorização a cada etapa.

## Índice

| #   | Documento                                                    | Assunto                                                              |
| --- | ------------------------------------------------------------ | -------------------------------------------------------------------- |
| 00  | [Visão geral](./00-visao-geral.md)                           | O que é o app, público, escopo MVP vs. futuro, princípios de produto |
| 01  | [Diagnóstico e stack](./01-diagnostico-e-stack.md)           | Estado atual do repositório e decisões de stack travadas             |
| 02  | [Arquitetura de pastas](./02-arquitetura-de-pastas.md)       | Estrutura de diretórios proposta e convenções                        |
| 03  | [Modelo de dados](./03-modelo-de-dados.md)                   | Tabelas, relacionamentos, índices e RLS                              |
| 04  | [Motor de recorrência](./04-motor-de-recorrencia.md)         | Coração do app: recorrência dinâmica, overrides e conclusões         |
| 05  | [Autenticação e RLS](./05-autenticacao-e-rls.md)             | Supabase Auth com SSR, guarda de rota e policies                     |
| 06  | [PWA](./06-pwa.md)                                           | Manifest, service worker, instalação, offline                        |
| 07  | [Push notifications](./07-push-notifications.md)             | Visão de alto nível, opções e trade-offs                             |
| 08  | [Roadmap de implementação](./08-roadmap-de-implementacao.md) | Sequência de fases segura                                            |
| 09  | [Plano de testes](./09-plano-de-testes.md)                   | Estratégia de verificação por fase                                   |
| 10  | [UI e páginas](./10-ui-e-paginas.md)                         | Descrição de cada tela, componentes shadcn e heurísticas de UX       |

## Como usar

1. Leia `00` → `01` para entender o produto e o ponto de partida.
2. Use `02` → `05` como referência de arquitetura durante a implementação.
3. `04` é o documento mais importante — releia antes de mexer em qualquer coisa de recorrência.
4. Siga a ordem de `08` para implementar sem retrabalho; valide cada fase com `09`.
