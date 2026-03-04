# Routstr Frontend

## Overview

Routstr is a decentralized LLM routing marketplace powered by Nostr and Bitcoin. This repository contains the Next.js app (App Router) that provides the UI for browsing providers/models, interacting with models via an OpenAI-compatible API, and handling Cashu/Lightning flows.

## Tech Stack

- **Framework**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS v4, `tailwind-merge`
- **UI Primitives**: Radix UI, Lucide icons
- **Protocols**: `nostr-tools` (NIP-07, signing, relays)
- **Payments**: `@cashu/cashu-ts`
- **Data Viz**: `react-globe.gl`, `three`, `cobe`

## Getting Started

### Requirements

- Node.js ≥ 18.18 (20 LTS recommended)
- npm ≥ 9

### Quickstart

```bash
npm install
npm run dev
# open http://localhost:3000
```

### Scripts

- `npm run dev` — Start the dev server (Turbopack)
- `npm run build` — Build for production
- `npm run start` — Start the production server
- `npm run lint` — Run ESLint

## Project Structure

```text
app/                 # App Router pages and routes
  models/            # Model listing and detail routes
  providers/         # Provider listing and detail routes
  roadmap/           # Roadmap page
components/          # UI and feature components (incl. ui/ primitives)
lib/                 # Helpers (nostr, utils, filters)
utils/               # Domain utilities (cashu, nip60, storage)
context/             # React contexts (e.g., NostrContext)
```

## Configuration & Environment

- No required environment variables for local development are currently used by the app.
- Images from Twitter domains are allowed via `next.config.ts` (`pbs.twimg.com`). If you fetch images from other domains, add them there.

## Styling

- Tailwind CSS v4 using `@tailwindcss/postcss` config. Global styles live in `app/globals.css`.

## Deployment

This app is configured for static export (client-only runtime) via:

- `next.config.ts` → `output: "export"`
- production build output directory: `out/`

### Cloudflare Pages

Use these settings in Cloudflare Pages:

- Framework preset: `Next.js (static export)` or `None`
- Build command: `npm run build`
- Build output directory: `out`

### Notes

- Dynamic detail routes (`/models/[...modelId]`, `/providers/[id]`, `/blog/[slug]`) are pre-rendered at build time using `generateStaticParams`.
- For full model/provider detail page generation, the build environment needs outbound access to your provider/model sources (for example `api.routstr.com`).

Build locally:

```bash
npm run build
```

## Contributing

Please check the Issues tab and coordinate work via the project board: [github.com/orgs/Routstr/projects/1](https://github.com/orgs/Routstr/projects/1). Happy contributing!

## License

MIT — see [LICENSE](LICENSE).
