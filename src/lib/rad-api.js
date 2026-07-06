/**
 * Radicle data layer — every read goes through the user's own node.
 *
 * Transport:
 *  - In Freedom Browser, `fetch('rad://<rid>/…')` is resolved by the
 *    browser's rad: protocol handler against the local radicle-httpd.
 *  - In plain-browser dev, the same paths go through the vite proxy
 *    (`/rad/rad:<rid>/…` → local dev httpd, see vite.config.js).
 *  - In node tests, `configureRadApi({ base })` points requests straight
 *    at a local httpd.
 *
 * No hosted gateways, ever.
 */

const state = {
  /** 'rad' | 'proxy' | null (undetected) */
  mode: null,
  /** explicit base URL override (tests): e.g. http://127.0.0.1:8788/api/v1/repos/ */
  base: null,
};

export function configureRadApi({ base = null, mode = null } = {}) {
  state.base = base;
  state.mode = mode;
}

/** Detect once whether rad:// URLs are fetchable (Freedom Browser). */
async function detectMode() {
  if (state.mode) return state.mode;
  // Freedom Browser advertises itself on the injected provider; the rad:
  // scheme handler is injected alongside it, so the flag is authoritative.
  if (typeof window !== 'undefined' && window.radicle?.isFreedomBrowser === true) {
    state.mode = 'rad';
    return state.mode;
  }
  try {
    // Fallback probe for rad:-capable hosts without the provider: an
    // invalid RID still *resolves* (HTTP 400) when the scheme is handled;
    // in a plain browser fetch() rejects with TypeError before any
    // request is made.
    await fetch('rad:invalid-probe');
    state.mode = 'rad';
  } catch {
    state.mode = 'proxy';
  }
  return state.mode;
}

function buildUrl(mode, rid, path) {
  const suffix = path ? `/${path}` : '';
  if (state.base) return `${state.base}${rid}${suffix}`;
  if (mode === 'rad') return `${rid}${suffix}`; // rad:<rid>/<path>
  return `/rad/${rid}${suffix}`;
}

export class RadApiError extends Error {
  constructor(status, message, rid, path) {
    super(message);
    this.name = 'RadApiError';
    this.status = status;
    this.rid = rid;
    this.path = path;
  }
}

async function radFetch(rid, path = '', params = null) {
  const mode = await detectMode();
  let url = buildUrl(mode, rid, path);
  if (params) {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null)
    ).toString();
    if (qs) url += `?${qs}`;
  }
  let res;
  try {
    res = await fetch(url);
  } catch (err) {
    throw new RadApiError(0, `node unreachable: ${err.message}`, rid, path);
  }
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
      else if (body?.message) message = body.message;
    } catch {
      // non-JSON error body — keep the status message
    }
    throw new RadApiError(res.status, message, rid, path);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Repo metadata

/**
 * Normalize the httpd repo payload into what the UI needs.
 * Raw shape: { payloads: { 'xyz.radicle.project': { data, meta } }, delegates,
 *   threshold, visibility, rid, seeding }
 */
export function parseRepoInfo(raw) {
  const project = raw?.payloads?.['xyz.radicle.project'] ?? {};
  const data = project.data ?? {};
  const meta = project.meta ?? {};
  return {
    rid: raw.rid,
    name: data.name ?? raw.rid,
    description: data.description ?? '',
    defaultBranch: data.defaultBranch ?? 'main',
    head: meta.head ?? null,
    delegates: (raw.delegates ?? []).map((d) => (typeof d === 'string' ? d : d.id)),
    threshold: raw.threshold ?? 1,
    visibility: raw.visibility?.type ?? 'public',
    seeding: raw.seeding ?? null,
  };
}

export async function getRepo(rid) {
  return parseRepoInfo(await radFetch(rid));
}

// ---------------------------------------------------------------------------
// Source browsing

export function getTree(rid, sha, path = '') {
  // The root tree requires the trailing slash; subdirectory paths do not.
  return radFetch(rid, path ? `tree/${sha}/${path}` : `tree/${sha}/`);
}

export function getBlob(rid, sha, path) {
  return radFetch(rid, `blob/${sha}/${path}`);
}

export function getReadme(rid, sha) {
  return radFetch(rid, `readme/${sha}`);
}

export function getRemotes(rid) {
  return radFetch(rid, 'remotes');
}

// ---------------------------------------------------------------------------
// History

export function getCommits(rid, { parent, page = 0, perPage = 30 } = {}) {
  return radFetch(rid, 'commits', { parent, page, perPage });
}

export function getCommit(rid, sha) {
  return radFetch(rid, `commits/${sha}`);
}

// ---------------------------------------------------------------------------
// Collaborative objects (read-only)

export function getIssues(rid, { state = 'open', page = 0, perPage = 30 } = {}) {
  return radFetch(rid, 'issues', { state, page, perPage });
}

export function getIssue(rid, id) {
  return radFetch(rid, `issues/${id}`);
}

export function getPatches(rid, { state = 'open', page = 0, perPage = 30 } = {}) {
  return radFetch(rid, 'patches', { state, page, perPage });
}

export function getPatch(rid, id) {
  return radFetch(rid, `patches/${id}`);
}

// ---------------------------------------------------------------------------
// Helpers

const RID_RE = /^rad:z[1-9A-HJ-NP-Za-km-z]{20,60}$/;

/** Accepts `rad:<rid>`, `rad://<rid>`, or a bare `z…` id; returns `rad:z…` or null. */
export function normalizeRid(input) {
  if (!input) return null;
  let s = String(input).trim();
  if (s.startsWith('rad://')) s = `rad:${s.slice(6)}`;
  else if (!s.startsWith('rad:')) s = `rad:${s}`;
  s = s.replace(/\/.*$/, '');
  return RID_RE.test(s) ? s : null;
}

/** Short display form of a DID: did:key:z6Mkir…3voM */
export function shortDid(did, len = 6) {
  const key = String(did ?? '').replace(/^did:key:/, '');
  if (key.length <= len * 2 + 1) return key;
  return `${key.slice(0, len + 4)}…${key.slice(-len)}`;
}

export function formatTimestamp(ts) {
  if (!ts) return '';
  const ms = ts > 1e12 ? ts : ts * 1000;
  const d = new Date(ms);
  const days = (Date.now() - ms) / 86_400_000;
  if (days < 1) {
    const hours = Math.floor(days * 24);
    if (hours < 1) return `${Math.max(1, Math.floor(days * 24 * 60))} minutes ago`;
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }
  if (days < 30) {
    const n = Math.floor(days);
    return `${n} day${n === 1 ? '' : 's'} ago`;
  }
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
