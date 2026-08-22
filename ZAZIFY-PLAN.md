# Routstr landing page — Zazify plan

## What's there now

The site already has a real, specific identity — this isn't a blank slate:

- Near-black background (`#111111`), light-gray text, monospace type
  (Geist Mono) everywhere — a quiet, technical, "terminal" register that
  fits a Bitcoin/Nostr infrastructure product.
- One accent color used sparingly: Bitcoin orange, mostly in the
  Settlement Facet icon mark and a couple of status dots.
- Sharp, minimal cards and dividers — thin 1px borders, no heavy shadows,
  no gradient buttons (already avoided).
- A real logo mark exists (`public/icon.svg`, the "Settlement Facet"
  faceted-gem mark picked via logo-lab on 2026-08-21) — but it's **only
  wired up as the browser tab favicon**. The live header just shows the
  word "Routstr" in text; there's no visual mark anywhere in the actual
  UI yet.

## What's generic or missing

- **No light mode at all.** `<html className="dark">` is hardcoded in
  `app/layout.tsx`, and `globals.css` defines the exact same dark values
  twice (once under `:root`, once under `.dark`) — there's no separate
  light palette to fall back to, and no toggle.
- **The logo mark isn't light-mode-safe as-is.** `icon.svg` bakes a dark
  `#111111` rounded-square background directly into the SVG. Dropped
  onto a light header, that would render as a dark square, not a mark
  that adapts. It needs a light-context variant (transparent or
  light-background version) before it can go in a light-mode header.
- **No `/design` reference page.** Other projects (e.g. `projects/LR`)
  have a `/design` route that documents the live token set and
  components in one place — this project has nothing like it, so the
  only "source of truth" for the visual language is scattered across
  `globals.css` and whichever component happens to use a given pattern.

## Proposed direction

This project doesn't need a skin swapped in from the Zazified library —
it already has a specific, committed dark identity that reads closest to
the **Bitcoin Terminal** family (dark, technical, sparing orange accent,
monospace-forward). The right move is to **extend the existing tokens
into a proper three-tier light-mode counterpart**, not override the
existing look with a generic system.

Concretely:

1. **Light mode tokens.** Add a real light palette alongside the
   existing dark one (primitive → semantic → component tiers), wire up
   a toggle, and make sure every component that currently assumes dark
   (hardcoded hex values like `text-[#e5e5e5]`, `bg-[#171717]` sprinkled
   through `Features.tsx` especially) reads from tokens instead so it
   actually flips.
2. **Logo light-mode variant.** Derive a light-context version of the
   Settlement Facet mark from the existing SVG (same faceted-gem
   technique, adapted background/stroke treatment), and actually wire
   the mark into the header — right now no visual mark is used in the
   live UI at all, only the favicon.
3. **`/design` reference page.** New route mirroring the LR pattern —
   a sidebar-grouped catalog (Foundations / Tokens / Components) with
   sections for Overview, Colors, Typography, Motion, Buttons, and
   Cards, pulling live from the real CSS tokens so it can't drift out
   of sync with the actual site.

## Lab pass

Skipping `/logo-lab` — it's already been run extensively (4+ rounds,
63+ concepts). No need to re-run generation.

**Open question (unresolved as of this writing):** the gallery at
`/logo-lab` currently shows **"Bearer Token — Route Cut"** as the top
scorer (5/5, the only perfect score, default active tab) — a single
flat-path rounded-square mark with a chevron cut, which renders cleanly
with `fill="currentColor"` and adapts to both themes for free. That mark
was briefly wired into `components/RoutstrMark.tsx` and `public/icon.svg`,
then reverted back to the older multi-gradient "Settlement Facet" diamond
by an external edit outside this session (not undone by design — flagged,
not silently redone). The diamond uses hardcoded fixed colors, so it does
**not** adapt between light/dark automatically. Confirm which mark is
current before shipping.

## Execution notes (2026-08-22)

Shipped:

- **Light mode**: `app/globals.css` `:root` now holds a real light
  palette (same three-tier token model, "same energy, inverted" per
  direction); `.dark` unchanged. New `--brand` (#f7931a) / `--success`
  (#34d399) tokens, same value both themes. Toggle in
  `components/ThemeToggle.tsx`, state in `app/contexts/ThemeContext.tsx`
  (manual, defaults dark, persists to `localStorage`, no flash-of-wrong-
  theme via a blocking init script in `app/layout.tsx`).
- **Color sweep**: hardcoded hex/raw grays converted to semantic tokens
  site-wide, except decorative "device frame" content (simulated
  terminals, syntax-highlighted code blocks, screenshot letterboxes, the
  topup QR code's required-white background) — those stay fixed-dark (or
  fixed-light, for the QR quiet zone) on purpose in both themes.
- **Motion doctrine**: documented at `/design/motion` — transform/opacity
  only, scroll-gated loops, `prefers-reduced-motion` honored via
  `gsap.globalTimeline.timeScale(1000)` in `lib/gsap.ts` plus a global
  CSS fallback in `globals.css` for raw CSS animations.
- **`/design` reference page**: `app/design/` — Overview, Colors,
  Typography, Motion, Buttons, Cards, sidebar nav + mobile sheet, modeled
  on `projects/LR`'s `/design` pattern, pulling live from the real tokens
  and components rather than a separate spec.
- **Banned patterns respected**: no gradient buttons/cards introduced, no
  hard dividers where blur/opacity should carry hierarchy, no scroll
  hijacking, dark mode declared in both `:root`/`.dark` and kept in sync
  going forward via tokens rather than duplicated literals.
