# Sorn Design System

Subscription watchdog. Never get charged.

Last updated: 2026-04-29

This document describes the website as it exists now. Treat `src/app/globals.css`
and the shadcn/base components in `src/components/ui` as the implementation
source of truth.

## 1. Product Shape

Sorn tracks free trials and sends reminders before they bill.

Current user-facing routes:

| Route | Surface | Purpose |
| --- | --- | --- |
| `/` | Landing page | High-polish product intro with animated trial previews and a direct start path. |
| `/dashboard` | Main app | Add, view, complete, and open tracked trials. Manage reminder channels. |

Current primary flows:

| Flow | Current behavior |
| --- | --- |
| Add by URL | User enters or pastes a URL, Sorn normalizes it, infers a service name, fetches preview imagery, then asks for trial length. |
| Add by natural input | User can type text such as `Figma ends in 30 days`; the API parses service, URL, and end date. |
| Choose trial length | Shortcut buttons for 7 days, 30 days, 3 months, 12 months, plus manual calendar and natural date entry. |
| Reminders | Telegram is the active reminder path. WhatsApp appears as a reserved channel. |
| Auth | Clerk is optional. Without Clerk env vars the app works locally with browser storage; with Clerk it stores account data remotely. |

Voice rules:

- Keep copy brief, calm, and direct.
- Prefer concrete time language: `Figma ends tomorrow`, `3 active`, `All set.`
- Avoid alarmist copy and long onboarding explanations.
- Use sentence case for labels and body copy.

## 2. Visual Direction

The current UI is dark, glassy, and product-led. It keeps the original
black-and-amber watchdog identity, but the landing hero now uses a more neutral
off-black graphite SaaS stage: brand imagery carries most of the color, while amber is
reserved for a three-tier hierarchy: animated headline accent, static primary
CTA, and reduced-opacity supporting highlights. Cards are rich: image-backed
trial panels, blurred glass action buttons, large numeric countdowns, colored
urgency glow, and quiet orbit motion.

Design keywords:

- Off-black instrument panel
- Graphite landing spotlight
- Liquid glass overlays
- Image-led subscription cards
- Amber primary signal
- Mono dates and numeric counters
- Minimal, direct copy

Do not reintroduce the older serif/utility-card direction. The current site
uses Geist for both display and body, with Geist Mono for dates, counters,
keyboard hints, URLs, and compact metadata.

## 3. Theme Tokens

Tokens live in `src/app/globals.css`. Tailwind v4 maps these CSS variables with
`@theme inline`; there is no `tailwind.config`.

| Token | Value | Usage |
| --- | --- | --- |
| `--background` | `#0d1117` | Page background |
| `--foreground` | `#e8ebf0` | Primary text |
| `--card` | `#161b22` | Cards and elevated panels |
| `--popover` | `#161b22` | Dialogs and popovers |
| `--primary` | `#e8a838` | Primary CTA, amber state, focus ring |
| `--primary-foreground` | `#1a1000` | Text on amber buttons |
| `--secondary` | `#1c2230` | Secondary controls and muted surfaces |
| `--muted` | `#1c2230` | Low-emphasis controls and backgrounds |
| `--muted-foreground` | `#8b95a8` | Metadata and supporting text |
| `--destructive` | `#e05252` | Urgent trials and destructive/error text |
| `--destructive-muted` | `rgba(224, 82, 82, 0.1)` | Urgent tinted surfaces |
| `--success` | `#4caf7d` | Safe trials, connected state |
| `--success-muted` | `rgba(76, 175, 125, 0.1)` | Success tinted surfaces |
| `--warning-muted` | `rgba(232, 168, 56, 0.12)` | Amber tinted surfaces |
| `--surface-2` | `#1c2230` | Extra surface token |
| `--border` | `rgba(255, 255, 255, 0.08)` | Default borders |
| `--input` | `rgba(255, 255, 255, 0.14)` | Inputs |
| `--ring` | `#e8a838` | Focus rings |
| `--radius` | `0.625rem` | shadcn base radius |
| `--ease-premium` | `cubic-bezier(0.77, 0, 0.175, 1)` | Shared premium motion curve |

Tailwind aliases to use in components:

| CSS variable | Tailwind token |
| --- | --- |
| `--background` | `bg-background`, `text-background` |
| `--foreground` | `text-foreground`, `bg-foreground` |
| `--card` | `bg-card` |
| `--primary` | `bg-primary`, `text-primary`, `border-primary`, `ring-primary` |
| `--muted-foreground` | `text-muted-foreground` |
| `--destructive` | `text-destructive`, `bg-destructive` |
| `--success` | `text-success`, `bg-success` |

Raw colors should be rare. Existing exceptions are channel brand colors
for Telegram and WhatsApp icons and high-specificity visual effects.

## 4. Typography

Fonts are loaded in `src/app/layout.tsx` with `next/font/google`.

| Role | Family | CSS variable | Usage |
| --- | --- | --- | --- |
| Sans, body, display | Geist | `--font-geist` | All primary UI and display text |
| Mono | Geist Mono | `--font-geist-mono` | Dates, countdowns, URLs, keyboard hints, metadata |

Rules:

- Use `font-sans` for normal UI and display text.
- Use `font-mono` only where the UI benefits from tabular precision.
- Body text should remain compact: most labels and helper copy are `text-sm` or smaller.
- Use `tracking-normal`; do not add negative letter spacing.
- Use tabular numerals for timers and metrics. The body already sets
  `font-variant-numeric: tabular-nums`.

Current scale reference:

| Surface | Class pattern |
| --- | --- |
| Landing headline | `text-5xl sm:text-7xl md:text-8xl`, tight leading |
| Landing gradient subhead | `text-3xl sm:text-5xl md:text-6xl`, `font-semibold` |
| Dashboard title | `text-3xl md:text-4xl`, `font-semibold` |
| Trial card service | `text-base sm:text-xl`, `font-semibold` |
| Trial countdown | `text-[2.625rem] sm:text-5xl lg:text-6xl` |
| Metadata | `font-mono text-[11px] md:text-[12px]` |

## 5. Layout

The app is mobile-first and constrained to `max-w-7xl`.

Landing page:

- Full-screen dark hero with an off-black graphite glass stage, broad warm/cool rear gradients, subtle noise, and radial gold text spotlight.
- Header uses compact glass nav groups matched to the hero stage blur, radius, and low-opacity stroke.
- Main copy is centered and direct: headline, supporting gold subhead, trust signal, dominant CTA, and animated micro-sequence.
- Floating trial cards form a controlled triangular orbit around the copy, with one promoted anchor card.
- A three-card step row follows the first viewport.

Dashboard:

- Page padding: `px-3 py-5`, increasing slightly at larger breakpoints.
- Header contains title, date, channel popovers, auth controls, and an Add button.
- Summary panel sits directly below the header.
- Watchlist uses a one-column grid on mobile and two columns on large screens.
- Mobile has a fixed bottom-right Add button.

Dialog and popover surfaces:

- Add trial dialog is compact and centered.
- First-run onboarding dialog is wider, split into a visual setup rail and channel cards.
- Channel popovers use `liquid-glass` and compact forms.

## 6. Components

This project uses shadcn/ui base components with Base UI primitives. Prefer
composition from `src/components/ui` before writing custom controls.

Installed UI components:

`badge`, `button`, `calendar`, `card`, `dialog`, `empty`, `field`,
`input-group`, `input`, `label`, `popover`, `progress`, `separator`,
`textarea`, `toggle-group`, `toggle`.

### Landing Hero

Key elements:

- Compact nav: `Sorn` and dashboard link.
- Auth controls on the right when Clerk is configured.
- Headline: `Trials remembered.`
- Supporting gold subhead: `before they bill.`
- Trust signal: `Works with 1,000+ websites`.
- CTA: `Start for free`.
- Supporting mono copy: `no payment required`.
- Micro-sequence: `Paste URL -> pick expiry -> done`, with a quiet fade cycle.

Use Motion for entry sequencing and respect reduced motion with
`MotionConfig reducedMotion="user"`. Hero gold treatment has three tiers:
animated gradient for the headline accent, static gradient for the CTA, and a
softer reduced-opacity gradient for supporting text and separators.

### Floating Trial Cards

Landing preview cards use the same image-led language as dashboard trial cards.
They form a triangular orbit around the hero copy:

- Bottom-left Figma card is the anchor: 25% larger, strongest tilt, highest depth.
- Right Notion card uses medium tilt and depth.
- Top-left Linear card uses minimal tilt and the farthest depth.
- Pointer tilt is calculated from cursor distance to each card center, not from the viewport center.
- Entry choreography settles from blur, scale, and rotational offset into the final card angle.

Each card displays:

- Full-card OG image background with neutral legibility overlays
- Liquid glass favicon tile
- Service name
- Domain
- Animated days count with NumberFlow
- End date row with calendar icon

Status colors:

| State | Days remaining | Color |
| --- | --- | --- |
| Urgent | 1-2 days | `text-destructive` |
| Soon | 3-6 days | `text-primary` |
| Safe | 7+ days | `text-success` |
| Expired | 0 or fewer | `text-muted-foreground` |

Card glow accents:

| Card | Glow |
| --- | --- |
| Figma | Soft neutral/white depth glow |
| Notion | Warm neutral amber glow |
| Linear | Red urgency glow |

### Dashboard Trial Card

This is the main repeated object in the app. It is now an image-backed card,
not the older flat card spec.

Anatomy:

- Full-card background image from `trial.imageUrl`.
- Fallback image from `https://picsum.photos/seed/{hostname}/900/320`.
- Dark gradient overlays to keep text legible.
- Liquid glass favicon block at top-left.
- Service name and hostname.
- Liquid glass Complete action that expands on hover/focus at larger widths.
- Large animated countdown.
- End date row with calendar icon.
- Liquid glass Open Site action that expands on hover/focus at larger widths.

Implementation notes:

- Use `Card` and `CardContent`; the background and overlays are custom layers.
- Keep card minimum heights stable: mobile `min-h-68`, larger `sm:min-h-80`,
  `sm:aspect-video`.
- Use `AnimatedNumber` for countdowns.
- Use `formatTrialDate` for the visible date, but keep stored dates as
  `YYYY-MM-DD`.
- Do not place old status badges back on this card unless the whole card system
  is redesigned.

### Summary Panel

Current summary is intentionally compact:

- Active count
- Urgent count
- Next upcoming trial as `Name / YYYY-MM-DD`

It is a single rounded panel, not a three-card metric row.

### Watchlist Empty State

Uses shadcn `Empty` composition:

- Bell icon in amber muted media block.
- Title: `Nothing to watch`.
- Mono shortcut row with `A` and `Add Free Trial`.
- Add trial button.

### Add Trial Dialog

Step model:

1. URL or natural trial note.
2. Trial length.
3. Added confirmation.

URL step:

- `InputGroup` with centered `InputGroupInput`.
- Placeholder: `netflix.com or Figma ends in 30 days`.
- Paste button in `InputGroupAddon`.
- `Copy save tab` bookmarklet action.
- Continue button with `CornerDownLeft`.

Date step:

- `ToggleGroup` options: 7 days, 30 days, 3 months, 12 months.
- Keyboard hints `1` through `4`.
- `Select an end date` opens the calendar.
- `Type a date` opens natural date input with hint `5`.
- Natural examples: `next Friday, 45 days, end of May`.

Added step:

- Green success pulse.
- Title: `All set!`
- Copy: `We'll remind you 1 day before your trial ends.`

### Channel Popovers

The dashboard title row exposes Telegram and WhatsApp as icon buttons.

Telegram:

- One-click bot connection flow.
- Shows connected chat ID in mono when linked.
- Button labels: `Connect`, `Opening...`, `Waiting...`, `Connected`.

WhatsApp:

- Manual phone input is present.
- The broader integration is reserved for later.

### Onboarding Dialog

Authenticated users without Telegram configured see a first-run dialog:

- Split layout with setup steps on the left.
- Telegram recommended card with Open Telegram, copy link, refresh link, and
  manual fallback.
- WhatsApp card marked `Soon`.
- Footer actions: `Skip for now`, `Finish setup`.

## 7. Liquid Glass

Two custom component classes live in `src/app/globals.css`:

| Class | Use |
| --- | --- |
| `.liquid-glass` | Popovers, favicon blocks, large translucent panels |
| `.liquid-glass-action` | Expanding action buttons on trial cards |

Rules:

- Use these classes only for actual glass surfaces or glass actions.
- Keep children positioned above pseudo-elements with the existing class rules.
- Preserve the backdrop blur and inner highlight treatment.
- Avoid stacking liquid glass inside multiple nested cards unless the result is
  already proven in the current UI.

## 8. Motion

Motion is polished but controlled.

Libraries:

- `motion/react` for UI animation.
- `@number-flow/react` for counters and countdowns.
- `lenis` for smooth scrolling via `LenisRoot`.

Shared curve:

```txt
cubic-bezier(0.77, 0, 0.175, 1)
```

Current patterns:

| Interaction | Pattern |
| --- | --- |
| Page entry | Fade in and small vertical rise |
| Landing headline | Staggered word reveal |
| Landing CTA | Static gold gradient, larger glow pulse, hover lift, cursor-proximity magnetism |
| Landing cards | Slow triangular orbit, card-center cursor tilt, hover elevation |
| Landing sequence | Looping fade cycle across `Paste URL`, `pick expiry`, and `done` |
| Trial card image | Slow scale on hover/focus |
| Dialog step change | Crossfade with slight y/scale shift |
| Success state | Short green pulse and spring icon settle |
| Number changes | NumberFlow continuous transition |

Reduced motion:

- Use `useReducedMotion()` and pass `false` for initial animation where needed.
- Keep the global `prefers-reduced-motion` CSS guard intact.

## 9. Iconography

Default icon set: Lucide.

Rules:

- Import icons directly from `lucide-react`.
- Inside shadcn `Button`, use `data-icon="inline-start"` or
  `data-icon="inline-end"` where the button component expects it.
- Do not manually size most icons inside shadcn buttons; component styles own
  icon sizing.
- Branded Telegram and WhatsApp icons are inline SVG exceptions because Lucide
  does not provide brand marks.

Common icons:

| Icon | Use |
| --- | --- |
| `ArrowRight` | Landing CTA |
| `Bell`, `BellRing` | Empty state and reminder promise |
| `Bookmark` | Save-tab bookmarklet |
| `CalendarIcon` | End date |
| `Check`, `CheckCircle2` | Complete, connected, success |
| `Clipboard` | Paste/copy |
| `CornerDownLeft` | Continue/submit |
| `ExternalLink` | Open external site |
| `Plus` | Add trial |
| `Send` | Telegram |
| `Sparkles` | Natural language parsing and badge |

## 10. Data Model

Frontend trial type:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | `crypto.randomUUID()` locally; server-generated/persisted remotely |
| `name` | string | Display name inferred from preview or hostname |
| `url` | string | Normalized HTTP/HTTPS URL |
| `faviconUrl` | string/null | Preview favicon |
| `imageUrl` | string/null | Preview banner/card image |
| `trialEndDate` | `YYYY-MM-DD` | End date |
| `notifyVia` | `telegram`/`whatsapp`/`both` | Currently defaults to Telegram |
| `createdAt` | `YYYY-MM-DD` | Used for progress |
| `cancelledAt` | string/null | Marks complete/cancelled |

Derived status:

```txt
daysRemaining <= 0 => expired
daysRemaining <= 2 => urgent
daysRemaining <= 6 => soon
else               => safe
```

Database tables in `db/schema.sql`:

- `trials`
- `reminder_contacts`
- `website_previews`
- `telegram_connection_tokens`

## 11. Implementation Guardrails

- Keep new UI aligned with shadcn/base composition.
- Use `render` for Base UI custom triggers, not Radix-style `asChild`.
- Use `FieldGroup`, `Field`, `FieldLabel`, and `FieldError` for forms.
- Use `InputGroup` for input buttons/addons.
- Use `ToggleGroup` for small option sets.
- Use semantic Tailwind tokens before raw colors.
- Keep cards at stable dimensions so hover states and labels do not shift layout.
- Preserve keyboard flows: `A` opens add, date shortcuts use `1` to `5`,
  Escape exits natural date entry.
- Preserve accessible labels, `sr-only` descriptions, and `aria-live` messages.
- Read the relevant Next.js docs under `node_modules/next/dist/docs/` before
  changing route, font, metadata, or server API behavior.
