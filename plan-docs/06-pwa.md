# 06 — PWA

## Objetivo

Tornar o app **instalável** na tela inicial do celular, com carregamento rápido e comportamento de app nativo (tela cheia, ícone próprio, splash). Base necessária também para as push notifications (que exigem um service worker) — ver [07](./07-push-notifications.md).

## Estado atual

Apenas um stub: `public/manifest.json` é o do template ("TanStack App", ícones genéricos). **Não há** service worker, registro de SW, nem meta tags de iOS. Precisa ser refeito.

## Abordagem adotada — SW + manifest manuais

Na implementação (Fase 8), optamos por **service worker + manifest manuais** em vez do `vite-plugin-pwa`. Motivo: o TanStack Start não usa um `index.html` estático (a shell vem do `__root.tsx`), então a injeção automática do plugin (link do manifest + registro do SW) não se aplica; um SW manual é mais previsível e testável com o Nitro.

- **[public/manifest.webmanifest](../public/manifest.webmanifest)** — nome, ícones (192/512 + maskable), `display: standalone`, `start_url: /`, cores. Linkado no `head()` do `__root.tsx`.
- **[public/sw.js](../public/sw.js)** — SW mínimo: runtime cache **só de assets estáticos** (`/_build`, `/assets`, js/css/img). Navegações e respostas autenticadas **não** são cacheadas (evita servir HTML de sessão obsoleto).
- **Registro:** `components/pwa-register.tsx` registra `/sw.js` **apenas em produção** (evita dores de cache no dev).
- **Instalação:** `lib/pwa/use-install-prompt.ts` captura `beforeinstallprompt` (Android) e detecta iOS/standalone; o botão fica em **Ajustes**.

> **Ícones são placeholders** (`logo192.png`/`logo512.png` do template). Substituir por ícones próprios, incluindo um `maskable` de verdade, antes de publicar.

## Manifest correto (substituir o stub)

Definir com a identidade real do app:

- `name`: "Daily Tracker" · `short_name`: "Daily"
- `description`
- `start_url`: `/today` (ou `/`)
- `display`: `standalone`
- `theme_color` / `background_color` coerentes com o tema (zinc)
- `icons`: conjunto próprio — no mínimo 192×192 e 512×512, **incluindo um ícone `maskable`** (para Android recortar bem). Substituir `logo192.png`/`logo512.png` do template.

## Service worker — estratégia de cache

- **App shell / assets estáticos:** precache (Workbox) para abertura instantânea e offline básico de navegação.
- **Dados do usuário (API/queries):** _network-first_ com fallback — no MVP o foco é **offline de leitura tolerante**, não escrita offline. Escrita offline (fila de sincronização) fica como evolução futura.
- **Nunca cachear** respostas autenticadas de forma que vazem entre sessões; respeitar cabeçalhos e escopo por usuário.

## Meta tags e registro

- Registrar o SW no client (o plugin cuida disso; garantir que rode no ambiente TanStack Start).
- Adicionar no `<head>` (via `head()` do `__root.tsx`):
  - `theme-color`
  - `apple-mobile-web-app-capable` / `apple-mobile-web-app-status-bar-style`
  - `apple-touch-icon`
  - link para o `manifest.webmanifest`
- Fluxo de **prompt de atualização**: quando um novo SW estiver disponível, oferecer "atualizar" ao usuário (o plugin expõe hooks para isso).

## Instalação

- **Android/Chrome:** prompt de instalação nativo (capturar `beforeinstallprompt` para um botão "Instalar" no app).
- **iOS/Safari:** não há prompt programático — instalar é "Compartilhar → Adicionar à Tela de Início". Exibir uma instrução guiada quando detectar iOS em Safari não-instalado.

## Requisitos e limitações do iOS

- PWA instalada no iOS roda a partir de iOS **11.3+**, mas com restrições (sem alguns recursos de background).
- **Push notifications em PWA no iOS exigem iOS 16.4+** e que o app esteja **adicionado à Tela de Início** (não funciona na aba do Safari). Impacto direto no [07](./07-push-notifications.md).
- Testar sempre no dispositivo real: o comportamento de standalone/safe-areas (notch) difere do desktop.

## Checklist de "PWA pronto" (Fase 8)

- [ ] Manifest com nome, ícones (incl. maskable) e `display: standalone`.
- [ ] Service worker registrado e cacheando o app shell.
- [ ] Instalável no Android (prompt) e no iOS (add-to-home) — testado em device.
- [ ] Meta tags de iOS e `theme-color` presentes.
- [ ] Fluxo de atualização do SW funcionando.
- [ ] Lighthouse PWA sem erros críticos.

> Próximo: [07 — Push notifications](./07-push-notifications.md)
