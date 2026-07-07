/**
 * Radicle-index consumption (see radicle-index-service/docs/index-protocol.md).
 *
 * Indexes are snapshots on Swarm behind mutable feeds. In Freedom Browser
 * they're read with plain fetch('bzz://<feed>/…') through the user's own
 * Bee node. Users choose which index feeds they trust (localStorage);
 * multiple feeds are unioned, newer generatedAt winning per-RID.
 *
 * The index decides what you SEE; your node decides what's TRUE — index
 * data is discovery hints only, every click-through goes to rad:/provider.
 */

const FEEDS_KEY = "canopy.index-feeds";

/** The Freedom-operated reference index (feed manifest reference). */
export const DEFAULT_INDEX_FEED =
  "e1c89773d235c0539b700b4248014d83aa7cbcfeb8769dc761b633ff4e0dcadc";

export function getIndexFeeds() {
  try {
    const stored = JSON.parse(localStorage.getItem(FEEDS_KEY));
    if (Array.isArray(stored) && stored.length) return stored;
  } catch {
    // fall through to default
  }
  return [DEFAULT_INDEX_FEED];
}

export function setIndexFeeds(feeds) {
  const cleaned = feeds
    .map((f) => f.trim().replace(/^bzz:\/\//, ""))
    .filter(isSwarmRef);
  localStorage.setItem(FEEDS_KEY, JSON.stringify(cleaned));
  return cleaned;
}

export function isSwarmRef(value) {
  return /^[0-9a-f]{64}$/i.test(value ?? "");
}

// ---------------------------------------------------------------------------
// Transport: bzz:// in Freedom Browser; optional dev proxy elsewhere.

let bzzMode = null; // 'bzz' | 'proxy' | 'unavailable'

async function detectBzz() {
  if (bzzMode) return bzzMode;
  // Served from a bzz:// origin (desktop Freedom, iOS Freedom): the
  // runtime has a real scheme handler, so absolute bzz:// fetches work.
  // This is the clean discriminator — swarmit uses the same one. The
  // provider flag covers desktop when canopy is served over http (dev).
  if (
    typeof window !== "undefined" &&
    (window.location?.protocol === "bzz:" ||
      window.radicle?.isFreedomBrowser === true)
  ) {
    bzzMode = "bzz";
  } else {
    try {
      // Vite dev proxy to a local bee (optional; see vite.config.js).
      const res = await fetch("/bzz-health", {
        signal: AbortSignal.timeout(1500),
      });
      bzzMode = res.ok ? "proxy" : "unavailable";
    } catch {
      bzzMode = "unavailable";
    }
  }
  return bzzMode;
}

async function fetchFromFeed(feedRef, path) {
  const mode = await detectBzz();
  if (mode === "unavailable") return null;
  const url =
    mode === "bzz" ? `bzz://${feedRef}/${path}` : `/bzz/${feedRef}/${path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`index fetch ${path}: HTTP ${res.status}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// Index loading + union

/**
 * Load one index: manifest + all shards. Returns null when the transport
 * is unavailable (plain-browser dev without a bee proxy).
 */
export async function loadIndex(feedRef) {
  const manifest = await fetchFromFeed(feedRef, "manifest.json");
  if (manifest === null) return null;
  if (manifest.schema !== "radicle-index/1") {
    throw new Error(`unsupported index schema: ${manifest.schema}`);
  }
  const [repoShards, userShards] = await Promise.all([
    Promise.all(
      manifest.shards.repos.map((shard) => fetchFromFeed(feedRef, shard)),
    ),
    Promise.all(
      manifest.shards.users.map((shard) => fetchFromFeed(feedRef, shard)),
    ),
  ]);
  return {
    feedRef,
    manifest,
    repos: repoShards.flat(),
    users: userShards.flat(),
  };
}

/**
 * Load and union all configured indexes. Per-RID and per-DID conflicts
 * resolve to the index with the newest generatedAt. Unreachable feeds are
 * skipped (their errors reported in `errors`).
 */
export async function loadIndexes(feedRefs = getIndexFeeds()) {
  const results = await Promise.allSettled(
    feedRefs.map((ref) => loadIndex(ref)),
  );

  const indexes = [];
  const errors = [];
  results.forEach((result, i) => {
    if (result.status === "fulfilled" && result.value)
      indexes.push(result.value);
    else if (result.status === "rejected")
      errors.push({ feedRef: feedRefs[i], error: result.reason });
  });
  if (!indexes.length)
    return { available: false, repos: [], users: [], manifests: [], errors };

  indexes.sort((a, b) => a.manifest.generatedAt - b.manifest.generatedAt);
  const repoMap = new Map();
  const userMap = new Map();
  for (const index of indexes) {
    for (const repo of index.repos) repoMap.set(repo.rid, repo);
    for (const user of index.users) userMap.set(user.did, user);
  }

  return {
    available: true,
    repos: [...repoMap.values()].sort(
      (a, b) => b.lastActivity - a.lastActivity,
    ),
    users: [...userMap.values()],
    manifests: indexes.map((index) => index.manifest),
    errors,
  };
}

/** Per-item matchers (q is lowercased, non-empty) — usable with usePagedList. */
const matchUser = (user, q) =>
  (user.alias ?? "").toLowerCase().includes(q) ||
  user.did.toLowerCase().includes(q);

export const matchRepo = (repo, q) =>
  (repo.name ?? "").toLowerCase().includes(q) ||
  (repo.description ?? "").toLowerCase().includes(q) ||
  repo.rid.toLowerCase().includes(q);

/** Case-insensitive user search over alias and DID. */
export function searchUsers(users, query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return users.filter((user) => matchUser(user, q));
}

/** Case-insensitive repo search over name, description, and RID. */
export function searchRepos(repos, query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return repos.filter((repo) => matchRepo(repo, q));
}
