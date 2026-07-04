# 06 — PWA

## Objetivo

Tornar o app **instalável** na tela inicial do celular, com carregamento rápido e comportamento de app nativo (tela cheia, ícone próprio, splash). Base necessária também para as push notifications (que exigem um service worker) — ver [07](./07-push-notifications.md).

## Estado atual

Apenas um stub: `public/manifest.json` é o do template ("TanStack App", ícones genéricos). **Não há** service worker, registro de SW, nem meta tags de iOS. Precisa ser refeito.

## Abordagem recomendada — `vite-plugin-pwa`

Usar `vite-plugin-pwa` (baseado em Workbox) em vez de escrever o service worker à mão:

- Gera o service worker com estratégias de cache prontas.
- Gera/injeta o manifest a partir da config do Vite.
- Cuida do registro do SW e de prompts de atualização.
- Integra com o build do Vite 8 já usado no projeto.

> Verificar a compatibilidade da versão do plugin com Vite 8 + o plugin do TanStack Start ao implementar (Fase 8). Se houver atrito com o SSR do Nitro, a alternativa é um SW mínimo manual registrado no client.

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
