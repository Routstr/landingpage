# Routstr — Agent Onboarding Guide

Routstr gives users uncensorable access to AI over **Nostr + Bitcoin Lightning** —
no KYC, no credit cards, no accounts. The core tool is **routstrd**, a CLI daemon
that discovers the cheapest available AI provider, routes requests, and pays nodes in sats.

This file is for AI agents/assistants. Use it to onboard any user onto Routstr quickly.
The human-facing instructions live at <https://routstr.com/routstrd>.

## TL;DR — 3 commands

```bash
bun install -g routstrd   # 1. Install the daemon
routstrd onboard          # 2. Onboard (add --pi-agent/--opencode to skip the menu)
routstrd receive 2100     # 3. Top up 2100 sats via Lightning invoice
```

## Prerequisites

- **Bun** runtime — check with `bun --version`; if missing, install per <https://bun.com/docs/installation>.
- Sats in a Lightning wallet (or a Cashu token) to fund.

## Onboarding steps (for an agent)

1. Check Bun: `bun --version`. Install if missing.
2. Install routstrd: `bun install -g routstrd`
3. Run `routstrd onboard`. Pick the integration explicitly with a flag:
   `--pi-agent`, `--opencode`, `--claude-code`, `--openclaw`, or `--hermes`
   (use `--skip-integration` to skip the menu). With no flag, headless runs
   default to OpenCode.
4. Fund the wallet:
   - Lightning: `routstrd receive 2100` — a Lightning invoice and a QR code are printed in the terminal; scan the QR or pay the invoice.
   - Cashu: `routstrd receive <cashu-token>`
5. Verify: `routstrd balance`
6. Start the daemon if it isn't running: `routstrd start`

## Integrate a coding agent (if not done during onboard)

The same flags work directly on `onboard` (e.g. `routstrd onboard --pi-agent`).
To add or switch an integration later, use `clients add`:

```bash
routstrd clients add --claude-code
routstrd clients add --pi-agent
routstrd clients add --opencode
```

## Daily operation

```bash
routstrd start    # start daemon (default 127.0.0.1:8008)
routstrd balance  # wallet balance
routstrd top      # interactive TUI (usage + balance) — open in a new terminal
routstrd stop     # stop daemon
```

For a live dashboard, tell the user to open a new terminal and run `routstrd top`
(balance, provider, models, and usage are shown in the TUI).

## Teams / hosted instance

For teams, route through **routstrd-auth** (Bearer `sk-...` tokens, per-member npubs):

```bash
routstrd remote <your-instance>   # connect to a hosted instance
routstrd npubs register           # first user registers as admin
routstrd npubs add <member-npub>  # admin grants a teammate access
```

More: <https://github.com/routstr/routstrd-auth>

## Notes & safety

- The daemon listens on `127.0.0.1:8008` by default and is unauthenticated.
  Don't expose it publicly without `routstrd-auth`.
- Wallet/config live in `~/.routstrd/`; back up the wallet mnemonic.
- Full docs: <https://docs.routstr.com> · Repo: <https://github.com/routstr/routstrd>

## Agent playbook

1. Ask: self-hosted daemon or hosted team instance? Which coding agent?
2. Run the steps above with the user; ask before running anything that spends sats.
3. After setup, confirm `routstrd balance` is positive.
4. Point the user to <https://routstr.com/routstrd> for the human-facing page.
