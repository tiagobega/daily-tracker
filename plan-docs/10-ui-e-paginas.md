# 10 — UI e páginas

Guia de UI/UX por tela: o que cada página contém, quais componentes shadcn a compõem, as ações principais e as **heurísticas de UX** aplicadas. Serve de referência ao implementar as fases (ver [08](./08-roadmap-de-implementacao.md)).

## Princípios globais

- **Mobile-first / thumb-first.** Ações principais no alcance do polegar (metade inferior). Alvos de toque ≥ 44px. Nada crítico depende do topo da tela.
- **Tema do sistema.** Light/dark automático via CSS variables do shadcn/zinc (`next-themes`-style toggle opcional em Ajustes). Contraste AA em ambos.
- **Status sempre visível** (Nielsen #1). Skeletons no carregamento, atualização **otimista** com rollback, `toast` (sonner) para confirmação/erro.
- **Prevenção de erro** (#5) e **controle do usuário** (#3). Formulários com **`@tanstack/react-form` + validação Zod** (o mesmo `zodSchema` que valida no servidor valida no cliente); erros por campo, inline; ações destrutivas (arquivar/excluir) pedem confirmação (`AlertDialog`) e oferecem desfazer via toast quando possível.
- **Reconhecer, não lembrar** (#6). Ícones lucide **sempre com rótulo**; categorias com cor+ícone; datas relativas ("Hoje", "Amanhã").
- **Consistência** (#4). Mesmos componentes para as mesmas ações em todas as telas (ex.: criar via `Sheet`, confirmar via `AlertDialog`).
- **Minimalismo** (#8). Uma ação primária por tela; o resto em menus (`DropdownMenu`) ou telas secundárias.
- **PWA/standalone.** Respeitar `safe-area-inset` (notch/home bar); estados offline degradam com elegância.

## Navegação — Bottom Tab Bar

Barra fixa inferior, 4 abas com ícone + rótulo, item ativo destacado. Componente `layout/BottomNav`.

| Aba        | Ícone (lucide)   | Rota        |
| ---------- | ---------------- | ----------- |
| Hoje       | `calendar-check` | `/today`    |
| Calendário | `calendar`       | `/calendar` |
| Objetivos  | `target`         | `/goals`    |
| Ajustes    | `settings`       | `/settings` |

- **Criação rápida** não é uma aba: fica no input de topo da tela "Hoje" e/ou num **FAB** (`+`) que abre o `Sheet` de nova tarefa — disponível nas telas Hoje e Calendário.
- Header enxuto por tela (título + ação contextual). Sem hambúrguer.

---

## Telas

### 1. Login — `/login` (público)

**Objetivo:** entrar ou criar conta (e-mail + senha).

- **Conteúdo:** logo/nome, `Tabs` (Entrar | Criar conta), `Form` com `Input` e-mail, `Input` senha (toggle mostrar), `Button` primário full-width.
- **Componentes:** `card`, `tabs`, `form`, `input`, `button`, `sonner`.
- **UX:** validação inline (formato de e-mail, senha mínima) **antes** de enviar (#5); erros do Supabase traduzidos em linguagem clara (#9); estado de loading no botão (#1); foco automático no primeiro campo. Sem jargão técnico.

### 2. App shell — layout `_app`

**Objetivo:** moldura autenticada de todas as telas internas.

- **Conteúdo:** área de conteúdo com scroll + `BottomNav` fixa + `safe-area` padding. Header por rota.
- **Componentes:** `layout/AppShell`, `layout/BottomNav`, `scroll-area`, `sonner` (provider global).
- **UX:** navegação persistente e previsível (#4); guarda de sessão redireciona para `/login` sem "piscar" conteúdo protegido.

### 3. Hoje — `/today` (tela principal)

**Objetivo:** ver e concluir as tarefas do dia com o mínimo de atrito.

- **Conteúdo:**
  - **Cabeçalho de data:** dia atual ("Hoje, 4 de julho"), setas ‹ ›/swipe para navegar dias; botão "voltar para hoje" quando fora da data atual.
  - **Input rápido** (topo): campo único "O que precisa fazer?" → Enter cria task de hoje (`is_recurring=false`). Ícone opcional para expandir campos (horário, categoria).
  - **Lista do dia:** `Card`/linha por ocorrência com `Checkbox` de conclusão, título, horário, `Badge` de categoria (cor). `DropdownMenu` (⋯) → Editar, Arquivar, (futuro) Pular.
  - **Progresso do dia:** contador "3/7 concluídas" + barra fina.
  - **Empty state:** ilustração + "Nada para hoje. Adicione sua primeira tarefa."
- **Componentes:** `input`, `checkbox`, `card`, `badge`, `dropdown-menu`, `progress`, `skeleton`, `alert-dialog` (arquivar), `sheet` (editar).
- **UX:** criação em 1 gesto (#7 flexibilidade); conclusão **otimista** com toast e desfazer (#1/#3); marcar concluído **nunca** altera a task principal (só `task_completions`); arquivar confirma (#5); estados de loading/empty/erro explícitos.
- **Nota:** na Fase 3 a lista busca `starts_on == dia`; na Fase 4 passa a vir do motor de recorrência (ver [04](./04-motor-de-recorrencia.md)) — o layout não muda.

### 4. Nova/editar tarefa — `Sheet` (bottom sheet)

**Objetivo:** criar/editar a task principal (inclui recorrência).

- **Conteúdo:** `Form` com título, descrição, categoria (`Select`), data (`Calendar`+`Popover`), horário (`Input time`), prioridade (`Select`), estimativa (min), e **editor de recorrência**: switch "Repetir" → controles (frequência, intervalo, dias da semana via `ToggleGroup`, "até" opcional). Preview em linguagem natural ("Toda seg e qui, às 08:00").
- **Componentes:** `sheet`, `form`, `input`, `textarea`, `select`, `calendar`, `popover`, `switch`, `toggle-group`, `button`.
- **UX:** só o título é obrigatório (#5); recorrência escondida atrás do switch (progressive disclosure, #8); preview textual traduz o jsonb para o usuário (#2 match com o mundo real); ao editar ocorrência recorrente, perguntar escopo — "só este dia" (override) vs "toda a série" (#3).

### 5. Calendário — `/calendar`

**Objetivo:** visão mensal do cumprimento.

- **Conteúdo:** grade do mês (`Calendar` custom) com indicadores por dia (ponto/anel de progresso: nada / pendente / tudo concluído); navegação ‹ mês ›; tocar num dia abre a lista daquele dia (reusa a UI de "Hoje").
- **Componentes:** `calendar`, `badge`/dot, `sheet` ou navegação para `/today?date=`.
- **UX:** densidade legível (#8); estado de cada dia reconhecível pela cor (#6); coerência total com a tela Hoje (#4).

### 6. Objetivos — `/goals` e `/goals/$goalId`

**Objetivo:** acompanhar metas alimentadas pelas conclusões.

- **Lista:** `Card` por objetivo com título, barra de **progresso** (derivado e ponderado), período e prazo. FAB "novo objetivo".
- **Detalhe:** progresso grande, tarefas vinculadas (com `weight`), ações de vincular/desvincular task e editar meta.
- **Componentes:** `card`, `progress`, `select`/`command` (vincular task), `slider`/`input` (peso), `dropdown-menu`, `alert-dialog`.
- **UX:** progresso como status visível e motivador (#1); explicar como o progresso é calculado (tooltip/`HoverCard`) para casar modelo mental (#2); vincular tarefas com busca (`Command`) evita rolar listas longas (#6).

### 7. Categorias — `/settings/categories`

**Objetivo:** gerenciar nichos (cor/ícone).

- **Conteúdo:** lista de categorias com cor+ícone+nome; criar/editar em `Sheet` (nome, `color picker`, seletor de ícone lucide); excluir com confirmação (avisa que tarefas ficam sem categoria, não são apagadas).
- **Componentes:** `card`/lista, `sheet`, `input`, seletor de cor, `alert-dialog`.
- **UX:** preview ao vivo da cor+ícone (#1); confirmação explica a consequência real do delete (#9, `SET NULL` nas tasks).

### 8. Ajustes — `/settings`

**Objetivo:** perfil, preferências e conta.

- **Conteúdo (seções):**
  - **Perfil:** nome, **timezone** (`Select` de IANA) — base para os "dias".
  - **Aparência:** tema (Sistema/Claro/Escuro).
  - **Categorias:** atalho para a tela 7.
  - **Notificações:** permissão de push (quando a Fase 9 existir) — botão com estado (permitido/bloqueado) e explicação.
  - **Instalar app:** botão "Adicionar à tela inicial" (usa `beforeinstallprompt`; no iOS, instrução guiada).
  - **Conta:** e-mail, **Sair** (`signOut`).
- **Componentes:** `card`, `select`, `switch`/`radio-group`, `button`, `separator`, `alert-dialog` (sair).
- **UX:** timezone explicado ("usado para definir o seu 'dia'") (#2); ações agrupadas e rotuladas (#4); sair confirma para evitar toque acidental (#5).

---

## Estados transversais (todas as telas)

- **Loading:** `Skeleton` que espelha o layout final (não spinner solto).
- **Empty:** ilustração leve + texto orientando a próxima ação + botão.
- **Erro:** mensagem clara + ação de retry; nunca stack trace. Erros de rede diferenciados de erros de validação.
- **Offline (PWA):** banner discreto "Sem conexão — mostrando dados salvos" (leitura); escrita bloqueada com aviso no MVP.
- **Feedback:** toda mutação relevante gera `toast`; destrutivas oferecem "Desfazer".

## Componentes shadcn a instalar

`button` · `input` · `textarea` · `label` · `checkbox` · `switch` · `radio-group` · `select` · `card` · `badge` · `sheet` · `dialog` · `alert-dialog` · `dropdown-menu` · `popover` · `calendar` · `command` · `toggle-group` · `progress` · `skeleton` · `separator` · `scroll-area` · `sonner` (toast) · `avatar` · `tabs`.

> **Componentes por padrão:** montar layouts com **shadcn/ui**, não controles nativos. Conjunto padrão: `select`, `calendar`, `input`, `input-group`, `empty`, `textarea`, `dialog`, `checkbox`, `switch`, `field` (+ `button`, `card`, `sheet`, `dropdown-menu`, `alert-dialog`, `popover`, `sonner`). Regra prática: `<select>`→`Select`, checkbox/toggle→`Switch`/`Checkbox`, wrappers de campo→`Field`/`FieldGroup`/`FieldLabel`, data→`Calendar` em `Popover`, empty state→`Empty`, input+botão inline→`InputGroup`.

> **Formulários:** NÃO usar o componente `form` do shadcn (baseado em react-hook-form). A camada de formulários é **`@tanstack/react-form`** com validação **Zod**, compondo os componentes shadcn (`Field`, `Input`, `Select`, etc.) nos campos. Padronizar field wrappers em `components/form/` se o boilerplate crescer.
> Instalar componentes sob demanda por fase (`pnpm dlx shadcn@latest add <nome>`), não tudo de uma vez. Compor classes com o helper `cn` ([src/lib/utils.ts](../src/lib/utils.ts)).

## Mapa telas × fases

| Fase | Telas entregues                                                        |
| ---- | ---------------------------------------------------------------------- |
| 1    | Login, App shell (nav básica), rota protegida de teste                 |
| 3    | Hoje + Sheet de tarefa (sem recorrência), Categorias (básico)          |
| 4–5  | Editor de recorrência no Sheet; escopo de edição (ocorrência vs série) |
| 6    | Calendário                                                             |
| 7    | Objetivos (lista + detalhe)                                            |
| 8    | Ajustes: instalar app, tema; polimento PWA                             |
| 9    | Ajustes: permissão de notificações                                     |

> Voltar ao [índice](./README.md).
