<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This repo uses Next.js 16.2.4 with APIs, conventions, and file structure that
may differ from older Next.js knowledge. Before writing code that touches Next
routes, layouts, metadata, fonts, middleware/proxy behavior, or route handlers,
read the relevant guide in `node_modules/next/dist/docs/`. Heed deprecation
notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:ui-component-rules -->
# UI component rule

Prefer shadcn/ui components and documented shadcn composition patterns before
native HTML or custom UI implementations. If a shadcn component exists for a UI
need, use it first. Use native elements only when shadcn has no suitable
component or when native browser behavior is explicitly required.
<!-- END:ui-component-rules -->

# Project Context

Sorn is a dark, glassy subscription trial watchdog. The live website is
documented in `DESIGN.md`; keep that file updated whenever the UI direction,
tokens, component anatomy, or user flows change.

Current stack:

- Next.js App Router in `src/app`
- React 19
- Tailwind CSS v4 with `@theme inline` in `src/app/globals.css`
- shadcn/ui `base-nova` with Base UI primitives
- Lucide icons
- Motion for React
- NumberFlow for animated counters
- Clerk optional auth
- Turso/libSQL for remote persistence
- Telegram reminder onboarding and dispatch

# shadcn Project Rules

The shadcn config is `components.json`.

- Base primitive library: `base`, so custom triggers use `render`, not `asChild`.
- UI alias: `@/components/ui`.
- Utilities alias: `@/lib/utils`.
- Icon library: `lucide-react`.
- Tailwind CSS file: `src/app/globals.css`.
- Installed components include `badge`, `button`, `calendar`, `card`,
  `dialog`, `empty`, `field`, `input-group`, `input`, `label`, `popover`,
  `progress`, `separator`, `textarea`, `toggle-group`, and `toggle`.

When editing UI:

- Use `Button`, `Card`, `Badge`, `Dialog`, `Popover`, `Empty`, `Field`,
  `InputGroup`, `ToggleGroup`, `Calendar`, and `Separator` before custom markup.
- Forms should use `FieldGroup`, `Field`, `FieldLabel`, `FieldError`, and
  `FieldDescription` as appropriate.
- Input buttons belong in `InputGroupAddon`/`InputGroupButton`.
- Icons inside buttons should use `data-icon="inline-start"` or
  `data-icon="inline-end"` where supported.
- Use semantic tokens such as `bg-background`, `bg-card`, `text-foreground`,
  `text-muted-foreground`, `text-primary`, `text-destructive`, and
  `text-success`.
- Do not add a Tailwind config file; theme variables live in
  `src/app/globals.css`.

# Current UI Patterns

Preserve the current visual system unless the user asks for a redesign:

- Dark background with amber primary, green success, and red urgent states.
- Geist Sans for body/display and Geist Mono for dates, URLs, counters, and
  compact metadata.
- Liquid glass classes in `src/app/globals.css`: `.liquid-glass` and
  `.liquid-glass-action`.
- Landing page in `src/components/home/home-landing.tsx` uses animated hero
  copy, floating preview cards, and a three-step row.
- Dashboard in `src/components/sorn-dashboard.tsx` uses a compact header,
  channel popovers, a summary panel, and image-backed trial cards.
- Trial cards in `src/components/dashboard/trial-card.tsx` are image-led cards
  with glass favicon/action controls and large animated countdowns.
- The add-trial flow is a compact dialog: URL or natural note, trial length,
  then success.
- Auth is optional. Without Clerk env vars, use local browser storage. With
  Clerk env vars, clear local cache and use API-backed remote data.

# Behavior Notes

- Trial dates are stored as `YYYY-MM-DD`.
- Status derivation lives in `src/lib/sorn.ts`: expired at `<= 0`, urgent at
  `<= 2`, soon at `<= 6`, safe after that.
- Website previews include service name, favicon, normalized URL, and image.
- Telegram is the active reminder channel. WhatsApp UI exists but is currently
  a reserved/manual channel surface.
- Keyboard affordances matter: `A` opens Add, trial length shortcuts use `1`
  through `5`, and Escape returns focus from natural date entry.
- Keep `aria-live`, `sr-only` labels/descriptions, and accessible dialog titles
  intact.

# Development

- Package manager: npm (`package-lock.json` is present).
- Useful checks: `npm run lint` and `npm run build`.
- Do not overwrite unrelated dirty work. This repo often has active local
  changes.
