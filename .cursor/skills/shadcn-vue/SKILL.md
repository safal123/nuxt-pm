---
name: shadcn-vue
description: Use shadcn/vue components from the official catalog for Nuxt UI. Apply when building forms, dialogs, dropdowns, selects, tabs, badges, or any other UI control instead of custom HTML.
---

# shadcn/vue

This project uses [shadcn/vue](https://www.shadcn-vue.com/docs/components) via `shadcn-nuxt`. Installed primitives live in `components/ui`. There is no component prefix.

## Rules

1. Prefer an existing file in `components/ui` before adding a new primitive.
2. If the needed control is missing, add it from the official catalog. Do not hand-roll a one-off button, select, dropdown, dialog, tabs, or similar.
3. Before adding or restyling a component, read its page under https://www.shadcn-vue.com/docs/components (for example `/docs/components/select`, `/docs/components/dropdown-menu`).
4. Add missing primitives with the shadcn-vue CLI, then compose them. Do not copy a full component from memory if the CLI can install it.

```bash
npx shadcn-vue@radix add <component>
```

Use `@radix`, not `@latest`. This app is on radix-vue (`shadcn-nuxt` 0.11). The latest CLI expects Reka UI and a newer `components.json`.

5. Auto-imported names match the docs (`Button`, `Dialog`, `DropdownMenu`, `Select`). Do not add a `Ui` prefix.
6. Style with semantic tokens (`bg-background`, `text-foreground`, `border-border`, `bg-muted`) so light/dark themes keep working.
7. Icons come from `lucide-vue-next`. Forms use the existing vee-validate + zod `Form` helpers when a field needs validation.

## Already installed

button, dialog, dropdown-menu, form, input, label, select, separator, sheet, sidebar, skeleton, tooltip, breadcrumb, table, tabs, pagination, calendar, popover, badge

## Adding a control

1. Check `components/ui` and https://www.shadcn-vue.com/docs/components
2. `npx shadcn-vue@radix add <name>` if it is not installed
3. Wrap it in a small project component when the control has app-specific options (see `PrioritySelect.vue`, `StatusSelect.vue`)
