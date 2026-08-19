# Project State — Canopy / window.radicle / Radicle Index

_Session knowledge dump, 2026-07-07. Written for a context-compacted Claude
(or any collaborator) to resume with full tacit knowledge. Everything here
was verified working at write time._

## The vision (shipped and working end-to-end)

A GitHub.com clone (**canopy**) served from **Swarm**, reading code from
the **Radicle** p2p network, with global discovery via a **Swarm-hosted
index** — zero servers, everything through the user's own nodes.

Core principles (Florian's, non-negotiable):
- **No hosted gateways, ever.** All data paths go through the user's own
  local nodes. Dev mode proxies to the developer's own node.
- **Reads need no provider API**: the browser resolves `rad:`/`bzz:` URL
  schemes like any URL. `window.radicle` is for consented *actions* only.
- **The index decides what you SEE; your node decides what's TRUE.**
  Indexes are user-selectable discovery views (swarmit-curator model);
  all content is verified by the user's node on click-through.

## Repos and where they stand

### 1. freedom-browser — branch `feature/radicle-provider` (LOCAL ONLY, not pushed)
8 commits on top of main. Contents:
- **`rad:` fetchable scheme** (`src/main/radicle/rad-protocol.js` + tests;
  registration in `index.js`). Registered **non-standard** deliberately:
  standard schemes lowercase hosts, which destroys case-sensitive base58
  RIDs. Repo-scoped (`/api/v1/repos/rad:<rid>/…`), GET/HEAD only,
  traversal-validated, CORS `*`. The old webRequest rewriter's rad branch
  (and `convertProtocolUrl` entirely) was removed as dead code.
- **`window.radicle` provider** — 4-layer mirror of the swarm provider:
  page injection (`webview-preload.js`), renderer router
  (`src/renderer/lib/radicle-provider.js`), consent UI
  (`src/renderer/lib/radicle-consent.js` — **sidebar subscreen**
  `#sidebar-radicle-consent` in index.html, opened via
  `sidebar.openForConsent()` which honors the radicle flag independently
  of the wallet flag), main authority
  (`src/main/radicle/radicle-provider-ipc.js`) with full re-validation.
  Tiers: connection → node (seed prompt per repo) → signing (one
  OAuth-style grant per origin covers all writes). COB writes shell out
  to the bundled `rad` CLI via `--repo` (no working copy) in
  `src/main/radicle/cob-service.js`. Permissions in
  `radicle-permissions.json` (`src/main/radicle/radicle-permissions.js`).
- **Node alias editing** — sidebar Nodes tab, Radicle card
  (`src/renderer/lib/radicle-alias.js`); writes `node.alias` to config
  (validated: ≤32 bytes, no whitespace; `rad config set` is deprecated),
  restarts managed node to re-announce. `radicle_getNodeStatus` returns
  `alias` at connection tier, `nid` only with signing grant.
  **Open issue:** the hardcoded default alias `'FreedomBrowser'` remains
  in `radicle-manager.js:270,306` and `identity-manager.js:619,660` —
  every user announces it until they edit. Onboarding wizard deliberately
  untouched.
- **Spec**: `docs/radicle-provider-api.md` (v0.1, actions-only, error
  codes aligned with window.swarm, patch-creation design documented but
  deferred — needs working-copy story).
- **E2E**: `test-e2e/live/radicle-provider.spec.js` +
  `test-e2e/radicle-fixtures.js`. Fully offline: pre-baked isolated
  radicle node (no seeds/peers, public fixture repo + issue), canopy
  `dist/` on a local static server. Asserts: rad: reads render → connect
  consent → "connected as radicle-e2e" → issue write via signing consent
  → read-back → author-link → profile page. Run:
  `npx playwright test --project=live test-e2e/live/radicle-provider.spec.js`
  (needs a canopy build). ~20s.
- **Known open fix**: `PREFERRED_SEEDS` in `radicle-manager.js` still
  lists iris/rosa.radicle.network, which **reset all handshakes**
  (verified July 2026). `seed.radicle.xyz`
  (`z6MksmpU5b1dS7oaqF2bHXhQi1DWy2hB7Mh9CuN7y1DN6QSz@seed.radicle.xyz:8776`)
  works and is what the dev/e2e/indexer nodes use.

### 2. canopy — `/Users/florian/Git/freedom-dev/canopy`, branch main (LOCAL ONLY)
~13 commits. Vue 3 + Vite + Tailwind 4 + Pinia + TanStack vue-query
(+ IndexedDB persistence via `query-persist-client-core` + `idb-keyval`,
buster `v1`). Prettier default (double quotes).
- **Transports** (all auto-detected, no hosted gateways):
  - Radicle reads: `rad:<rid>/…` fetches (Freedom desktop) or `/rad/` vite
    proxy → local dev httpd. Detection in `src/lib/rad-api.js`
    (`window.radicle?.isFreedomBrowser` → probe `fetch('rad:invalid-probe')`).
  - Index reads: `bzz://<feed>/…` when `location.protocol === 'bzz:'`
    (desktop AND iOS Freedom) or `window.radicle?.isFreedomBrowser`;
    else `/bzz/` vite proxy (env `CANOPY_BEE`). `src/lib/index-api.js`.
- **Views**: GitHub-style repo pages (tree/blob/README/commits+diffs/
  issues/patches, seed-to-browse recovery, connect + write forms),
  identity pages `/#/users/<did>` (local scan + index-wide section),
  homepage = global network directory (search over repos **and users**,
  stats line, `⚙ index feeds` settings — localStorage, multi-feed union,
  newest `generatedAt` wins). Loading skeletons everywhere via
  `LoadingBar.vue` variants (list/cards/detail; `.skeleton` CSS shimmer).
- **Gotchas encoded in the data layer**: httpd filter param is `status`
  (NOT `state` — silently ignored); root tree needs trailing slash;
  private repos are invisible to httpd/rad:.
- **Dev env**: `npm run dev:node` (`scripts/dev-node.mjs`) = isolated
  RAD_HOME at `.dev/rad`, httpd on :8788, seeds heartwood +
  radicle-explorer via seed.radicle.xyz. `npm run dev` proxies `/rad/`→8788
  and `/bzz/`→`$CANOPY_BEE` (use the VPS tunnel for real index data:
  `ssh -f -N -L 11633:10.0.1.8:1633 root@5.78.195.10` then
  `CANOPY_BEE=http://127.0.0.1:11633 npm run dev`).
- **Tests**: `npm test` (44; integration suites skip loudly if dev node
  down). DEFAULT_INDEX_FEED in `src/lib/index-api.js` =
  `e1c89773d235c0539b700b4248014d83aa7cbcfeb8769dc761b633ff4e0dcadc`.

### 3. radicle-index-service — PUSHED to github.com/solardev-xyz/radicle-index-service
TS (node --experimental-strip-types), deps: bee-js 9 + ethers only.
- **Pipeline per cycle**: discover (gossip `routing` table = network
  inventory; `nodes` table = aliases; `announcements` table type='refs' =
  per-repo change signal) → extract stored repos **incrementally**
  (record cache `/data/records.json`; re-extract only when refs
  announcement newer or 24h full-sweep due; seeder counts refreshed on
  cached records; evicted repos fold in from the cache while gossip still
  knows them) → snapshot (repos.json + users.json + signed manifest.json,
  EIP-191) → **publish only when shard bytes changed** → **evict**
  (2026-08-19: storage is a working set — snapshotted repos are unseeded
  in chunks of 100 + rm'd from storage; stale `storage/*.tmp` pruned;
  kill switch `EVICT_AFTER_EXTRACT=false`; rad 1.9.1 has NO
  storage-removal command — `rad clean` only drops remotes, so it's
  `rad unseed` + direct `rm -rf storage/<z-part>`, verified safe against
  a live node) → THEN crawl (priority: evicted repos whose refs moved →
  never-indexed, most-seeded first → records older than `REFRESH_DAYS`
  default 7; bounded: `FETCH_PER_CYCLE`, wall-clock
  `FETCH_BUDGET_MINUTES` default 10, 45s per-seed timeout, exponential
  per-RID backoff, disk floor). Publish-first ordering is deliberate:
  freshness beats breadth. Context: the VPS hit `DISK_FLOOR_GB` at 49 GB
  of seeded repos (~4.8k indexed of 15.2k known) and the crawl froze —
  eviction unblocked it.
- **Spec**: `docs/index-protocol.md` (`radicle-index/1`; readers iterate
  `shards.*`; additive evolution).
- **Docker**: node:22-alpine + radicle musl binaries from
  files.radicle.xyz; entrypoint runs radicle-node (isolated identity,
  seed.radicle.xyz preferred) + httpd :8780 + worker; volume `/data`
  (RAD_HOME + out + state + records cache — CACHE_FILE env fixed to
  /data).

### 4. Ops — swarmit-coolify README (committed) has the full playbook + secrets
- **VPS**: Hetzner 5.78.195.10 (Coolify; API token in that README).
- **Indexer app**: uuid `vyn0omw0sha2xdo8bzxdzaxe`, deploys from GitHub
  main. Envs: `FETCH_PER_CYCLE=150`, `INTERVAL_MINUTES=20`,
  `DISK_FLOOR_GB=15`, `BEE_API_URL=http://bee:1633`,
  `STAMP_BATCH_ID=aa1b3d57f854786285d2e32c58ec59a7f17d930a6858e38f1392ebe8afff0379`
  (mutable, depth 17, ~340d TTL, label radicle-index — feeds NEED
  mutable batches), `FEED_SIGNER_KEY` (secret).
- **Feed signer**: `0xc135Fc20e21deF2Eab30b7C6495D46950a4e14cF` — clients
  pin this. Key lives in Coolify env + locally at
  `radicle-index-service/.signer-key-DO-NOT-COMMIT`. **Florian: back it
  up in the password manager.**
- **The index feed (stable, clients configure this)**:
  `bzz://e1c89773d235c0539b700b4248014d83aa7cbcfeb8769dc761b633ff4e0dcadc`
  At write time: 316 repos / 352 users indexed, gossip inventory 8k+ and
  climbing (~full network coverage expected within days).
- Deploy: `curl -H "Authorization: Bearer $TOKEN" "http://5.78.195.10:8000/api/v1/deploy?uuid=vyn0omw0sha2xdo8bzxdzaxe&force=false"`

## Published canopy (content-addressed, newest last)
`bzz://2266f07caea962a21eeb81bd666dfb567e5cd8fd0efaa986cb02aa727bda576c`
`bzz://9e080ecb1257886a2e22505de4a6db50862a312a0d334e6cc08f469261eca333`
(2026-07-07: seed-status UX, pagination/search, account menu, top-bar
unified search)
Published via a **pre-existing publisher antd on `127.0.0.1:1699`**
(another session's scratchpad process — will not survive reboot; its
stamps/data at
`/private/tmp/claude-501/…/14357b0a-…/scratchpad/publisher-node/`).
Publish pattern: `cd canopy && npm run build && cd dist && tar -cf x.tar .`
then POST to `http://127.0.0.1:1699/bzz` with headers
`Swarm-Collection: true`, `Swarm-Index-Document: index.html`,
`Swarm-Postage-Batch-Id: <first stamp>`, `Swarm-Pin: true`.
**Next step here**: a canopy release *feed* for one stable URL
(swarm_createFeed pattern), and a durable publish path (VPS bee).

## Platform notes
- **iOS Freedom Browser** lives at `nodes/swarm-mobile-ios`
  (NOT `freedom-mobile-ios` — that's an old prototype; memory saved).
  Real bee+kubo embedded via gomobile; `WKURLSchemeHandler` makes
  `bzz://` fetchable; pages get true bzz origins. **No radicle node on
  iOS** → canopy there = directory/profiles only; repo pages fail with
  the not-on-your-node error (could use a friendlier iOS message).
- **swarmit** falls back to the public ethswarm gateway ONLY on hosted-web
  origins (eth.limo) — decision pending whether that stays.

## Hard-won CLI/API facts (do not relearn)
- `rad issue open -q` prints NOTHING — parse the verbose output for the
  id. `rad issue comment`/`rad patch comment -q` print the id but may
  append announce chatter ("No seeds found…") — scan for the 40-hex line.
- `rad patch comment` accepts only long `--repo` (no `-r`).
- radicle-httpd: COB list filter param is `status`; `state` silently
  ignored. Root tree endpoint requires trailing slash. Private repos not
  served. `/api/v1/nodes/<nid>` returns alias/DID/SSH (not reachable via
  the rad: scheme — deliberately repo-scoped).
- Radicle aliases are gossiped in NodeAnnouncements, cached in node.db
  `nodes`; COBs store only DIDs; alias changes are retroactive at display
  time. Fresh nodes show bare DIDs until gossip warms.
- Bee: current images dropped `bee dev`; 2.2.0's dev mode has a broken
  SOC putter — test feed writes against a real node. Feed batches MUST be
  `Immutable: false`. bee-js 9: `writer.uploadReference`,
  `bee.createFeedManifest`, `uploadFiles` (works in node with File).
- Unix socket path limit (~104 chars) constrains RAD_HOME paths —
  use short paths (`/tmp/…`, `canopy/.dev/rad`).
- Electron: `standard:true` schemes lowercase hosts (kills base58 RIDs);
  non-standard + `supportFetchAPI` keeps URLs opaque and case-intact;
  Chromium normalizes `..` before the protocol handler, but validate
  `%2e%2e` yourself.

## Local processes possibly still running (dev machine)
- canopy dev node: pids in `canopy/.dev/node.pid` / `httpd.pid`
  (radicle-node + httpd :8788).
- vite dev server :5173 (started with CANOPY_BEE=http://127.0.0.1:11633).
- ssh tunnel 11633 → VPS bee (`pkill -f "11633:.*:1633"` to stop).
- `bee-dev` docker container (bee 2.2.0, leftover; `docker rm -f bee-dev`).
- publisher antd :1699 (another session's; leave running).

## Conventions
- TDD, integration tests against real nodes, standard npm commands only.
- `/simplify` after every work package, before committing.
- freedom-browser: never `git add -A`; stage explicit paths. One feature
  branch per feature. Push/PR only to github origin (solardev-xyz).
- Nothing in freedom-browser or canopy is pushed anywhere yet; Florian
  reviews locally. radicle-index-service is pushed (Coolify needs it).

## Seed-to-browse honesty (WP done 2026-07-07, uncommitted → this session)
`rad seed` exits 0 even when its fetch fails/times out; large repos
(e.g. radicle-desktop rad:z4D5…ury) can fail from EVERY seed with
`gix fetch error: Failed to consume the pack sent by the remote`
(reported empirically; node retries forever, leaves storage/<rid>.tmp).
Also: `rad sync --fetch --timeout Nsec` does NOT reliably self-terminate
mid-pack — always hard-kill the child. The "no candidate seeds…" error
prints on STDOUT.
Built: freedom-browser `src/main/radicle/seed-status.js` (per-RID fetch
state machine: policy-only seed via `--no-fetch`, bounded `rad sync`
retry driver with hard kill, node-stdout/stderr parsing for per-seed
results, storage/.tmp ground truth) + `radicle_getSeedStatus`
(connection tier, pollable) + non-blocking `radicle_sync` = retry path;
canopy `SeedFlow.vue` + store `seedProgress`/2s polling (idle → fetching
with live seeder count/elapsed/attempts → auto-render on arrival, or
honest failure + Try again; raw errors only behind "Technical details").
Also fixed en route: `updateLastUsed` 60s write debounce;
`normalizePreferredSeeds` now respects explicitly-set arrays (empty = 
deliberate isolation — e2e fixtures were silently getting iris/rosa
injected and reaching the real network!); exported missing
getNodeAlias/setNodeAlias (sidebar alias IPC would have thrown).

## Open follow-ups (roughly prioritized)
1. `PREFERRED_SEEDS` defaults in radicle-manager still list broken
   iris/rosa (explicit configs now respected; fresh profiles still get
   the broken defaults — swap in seed.radicle.xyz?).
2. Canopy release feed → one stable bzz URL across versions; move canopy
   publishing to the VPS bee (durable) instead of the scratchpad antd.
3. Permission management UI for radicle grants (revoke/auto-approve —
   swarm has one; radicle grants currently only editable via JSON).
4. Alias default: replace hardcoded 'FreedomBrowser' (onboarding field?).
5. Index shard splitting when repos.json/users.json outgrow single files;
   full-text search (pagefind-style inverted index) parked deliberately;
   COB-title search rejected by Florian for now.
6. webview-preload provider-shim triplication (eth/swarm/radicle) —
   parametrize; shared e2e webview helpers.
7. Patch creation via window.radicle (browser-managed working copies —
   design sketch in the provider spec).
8. iOS: friendlier no-radicle message in canopy; long-term mobile radicle
   story.
9. Report the large-repo pack failure upstream (Radicle Zulip) — cleanly
   reproducible on 1.9.1 from 5+ seeds.
