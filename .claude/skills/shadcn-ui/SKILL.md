---
name: shadcn-ui
description: Use when building or editing UI in this project — choosing, installing, or composing shadcn/ui components. Triggers on any layout/form/screen/component work (buttons, inputs, dialogs, selects, dates, tables, empty/loading states, toasts) or explicit mentions of shadcn. Tells you which component fits each need, whether it is already installed, and how to add and use it per project conventions.
---

# shadcn/ui in this project

Build layouts with **shadcn/ui components**, not native controls (user preference). Style: **new-york**, base **zinc**, lucide icons. Theme follows the system (light/dark via CSS vars).

## Workflow (every time you need a component)

1. **Check if installed** — look in `src/components/ui/` (list below). If present, just import from `#/components/ui/<name>`.
2. **Install if missing** — `pnpm dlx shadcn@latest add <name> --yes --overwrite` (the `--overwrite` avoids the interactive prompt on shared deps like `button`).
3. **Use per conventions** (below). Compose class names with `cn` from `#/lib/utils`.
4. Run `pnpm exec biome check --write <files>` and `pnpm exec tsc --noEmit` after.

## Already installed

`alert-dialog` · `button` · `calendar` · `card` · `checkbox` · `dropdown-menu` · `empty` · `field` · `input` · `input-group` · `label` · `popover` · `select` · `separator` · `sheet` · `sonner` · `switch` · `textarea`

## Need → component (pick the right one)

| Need | Component(s) |
|------|--------------|
| Form field wrapper (label + control + error) | `Field` / `FieldGroup` / `FieldLabel` / `FieldError` / `FieldDescription` |
| Single-line text | `Input` |
| Text + inline addon/button | `Input Group` |
| One-time code | `Input OTP` |
| Multi-line text | `Textarea` |
| On/off toggle | `Switch` |
| Boolean in a list/form | `Checkbox` |
| Pick one from few (mutually exclusive) | `Radio Group` or segmented `Toggle Group` |
| Pick one from many | `Select` (or `Native Select` for simplest) |
| Searchable pick / autocomplete | `Combobox` (built on `Command`) |
| Numeric range | `Slider` |
| Pick a date | `Date Picker` (= `Calendar` inside `Popover`) |
| Primary/secondary action | `Button`; related actions → `Button Group` |
| Confirm destructive action | `Alert Dialog` |
| Modal form / content | `Dialog`; slide-over/drawer → `Sheet` (or `Drawer` for mobile vaul) |
| Contextual actions menu (⋯) | `Dropdown Menu`; right-click → `Context Menu` |
| Floating helper on click | `Popover`; on hover → `Hover Card`; short hint → `Tooltip` |
| Command palette | `Command` |
| Toast / notification | `Sonner` (use `toast()` from `sonner`) |
| Inline message | `Alert` |
| Loading placeholder | `Skeleton` (layout) / `Spinner` (inline) |
| Progress bar | `Progress` |
| Empty state (no data) | `Empty` |
| Status label / tag | `Badge` |
| List/menu row primitive | `Item` |
| Keyboard shortcut hint | `Kbd` |
| Container | `Card` |
| Tabular data | `Table`; sortable/filterable → `Data Table` |
| Charts | `Chart` (recharts) |
| Tabs | `Tabs` |
| Collapsible section | `Collapsible`; multi → `Accordion` |
| Divider | `Separator` |
| Scrollable region | `Scroll Area` |
| Avatar | `Avatar` |
| Pagination | `Pagination` |
| Breadcrumb / nav | `Breadcrumb` / `Navigation Menu` / `Sidebar` |

## Conventions (must follow)

- **Formatting:** single quotes, tab indent (Biome). Imports use `#/*` alias.
- **Forms:** `@tanstack/react-form` + **Zod** (share the same schema client/server). Do **not** use shadcn's `form` component (react-hook-form). Wrap fields in `Field`/`FieldLabel`; put controls (`Input`, `Select`, etc.) inside.
- **Dates:** store as `YYYY-MM-DD` strings. Convert with `dateToISODate` / `isoToLocalDate` / `formatShortDate` in `#/lib/date`. Use `Calendar` (mode="single") inside a `Popover` as the date picker.
- **Toasts:** `import { toast } from 'sonner'`; `Toaster` is mounted once in `_app/route.tsx`.
- **Mobile-first:** primary actions within thumb reach; bottom sheet (`Sheet side="bottom"`) for forms.
- **Generated files:** `src/lib/supabase/database.types.ts` and `src/routeTree.gen.ts` are excluded from Biome. `src/components/ui/**` is **formatted** to project style but **excluded from the linter** (via a `biome.json` override) — shadcn components trip a11y/key rules by design; don't hand-fix them.
- **Installed set:** also `tabs`, `toggle`, `toggle-group`, `skeleton`, `progress`, `badge`.

## Related

- Preference recorded in memory: prefer shadcn components over native controls.
- UI/UX-per-screen reference: `plan-docs/10-ui-e-paginas.md`.
- Optional live registry access: the official **shadcn MCP server** (browse/search/install) — not configured; add it if you want always-current component metadata.
