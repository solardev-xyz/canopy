# 🌳 Canopy

A GitHub-style code forge for the [Radicle](https://radicle.xyz) peer-to-peer
network, built to be served from [Swarm](https://www.ethswarm.org) — with
**everything routed through the user's own node**. No servers, no hosted
gateways.

Canopy is a dApp for [Freedom Browser](https://github.com/solardev-xyz/freedom-browser):

- **Reads** use plain `fetch('rad:<rid>/…')` — Freedom Browser resolves the
  `rad:` scheme against the local `radicle-httpd` (repo-scoped, GET-only).
- **Actions** (seeding, issues, comments) use the `window.radicle` provider
  API — consent-gated, signed with the user's Radicle identity.

## Features

- Repository browsing: file tree, blobs with syntax highlighting, README
  rendering, delegates & seeding info
- Commit history with full structured diffs
- Issues: list, detail, discussion threads (read-only in v1)
- Patches: list, revisions, reviews, discussions (read-only in v1)

## Development

Canopy is developed against a real local Radicle node — never a public
gateway. Two terminals:

```sh
npm install
npm run dev:node   # isolated radicle-node + httpd (.dev/rad), seeds fixtures
npm run dev        # vite on http://localhost:5173 (proxies /rad/* to the node)
```

The dev node needs the Radicle binaries from a `freedom-browser` checkout
sitting next to this repo (or set `RADICLE_BIN`).

```sh
npm test           # vitest: unit + integration (integration needs the dev node)
npm run build      # production build (dist/)
```

## Architecture notes

- `src/lib/rad-api.js` — data layer; auto-detects `rad:` fetchability and
  falls back to the vite dev proxy. All responses come from radicle-httpd's
  `/api/v1/repos/<rid>/…` surface.
- Hash-based routing: canopy is served from content-addressed origins
  (`bzz://…`) that can't rewrite paths.
- Styling: Tailwind 4 with GitHub-Primer-inspired tokens, auto light/dark.
