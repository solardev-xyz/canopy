/**
 * Identity-page data assembly.
 *
 * Radicle has no global index — a profile is "this DID, as seen by your
 * node": we scan the repos this client knows about (the node's seeded
 * repos when connected, plus locally remembered ones) and filter for the
 * DID's delegate roles and authored collaborative objects.
 */

import { getRepo, getIssues, getPatches } from "./rad-api.js";

// Keep profile assembly bounded — each repo costs a handful of fetches.
const MAX_REPOS = 20;

export function normalizeDid(input) {
  if (!input) return null;
  const s = String(input).trim();
  const m = /^(?:did:key:)?(z6Mk[1-9A-HJ-NP-Za-km-z]{40,50})$/.exec(s);
  return m ? `did:key:${m[1]}` : null;
}

/** Dedupe candidate repo entries ({rid, ...}) preserving order. */
export function dedupeRepos(...lists) {
  const seen = new Set();
  const out = [];
  for (const list of lists) {
    for (const entry of list ?? []) {
      if (!entry?.rid || seen.has(entry.rid)) continue;
      seen.add(entry.rid);
      out.push(entry);
    }
  }
  return out.slice(0, MAX_REPOS);
}

const authoredBy = (did) => (item) => item?.author?.id === did;

/**
 * Scan one repo for a DID's presence. Returns null when the repo isn't
 * available on the node (not seeded) — profiles are best-effort by design.
 */
export async function scanRepoForDid(rid, did) {
  let repo;
  try {
    repo = await getRepo(rid);
  } catch {
    return null;
  }

  const [openIssues, closedIssues, openPatches, mergedPatches] =
    await Promise.all([
      getIssues(rid, { state: "open", perPage: 100 }).catch(() => []),
      getIssues(rid, { state: "closed", perPage: 100 }).catch(() => []),
      getPatches(rid, { state: "open", perPage: 100 }).catch(() => []),
      getPatches(rid, { state: "merged", perPage: 100 }).catch(() => []),
    ]);

  const issues = [...openIssues, ...closedIssues].filter(authoredBy(did));
  const patches = [...openPatches, ...mergedPatches].filter(authoredBy(did));

  return {
    repo,
    isDelegate: repo.delegates.includes(did),
    issues,
    patches,
  };
}

/**
 * Assemble the profile across all candidate repos.
 * @returns {{alias, maintains, issues, patches, scannedRepos}}
 */
export async function buildProfile(did, candidateRepos) {
  const scans = (
    await Promise.all(candidateRepos.map(({ rid }) => scanRepoForDid(rid, did)))
  ).filter(Boolean);

  const maintains = scans.filter((s) => s.isDelegate).map((s) => s.repo);
  const issues = scans.flatMap((s) =>
    s.issues.map((issue) => ({ ...issue, repo: s.repo })),
  );
  const patches = scans.flatMap((s) =>
    s.patches.map((patch) => ({ ...patch, repo: s.repo })),
  );

  // The gossip-resolved alias rides along on COB author objects.
  const alias =
    issues.find((i) => i.author.alias)?.author.alias ??
    patches.find((p) => p.author.alias)?.author.alias ??
    null;

  const byTime = (a, b) =>
    (b.discussion?.[0]?.timestamp ?? b.revisions?.[0]?.timestamp ?? 0) -
    (a.discussion?.[0]?.timestamp ?? a.revisions?.[0]?.timestamp ?? 0);

  return {
    alias,
    maintains,
    issues: issues.sort(byTime),
    patches: patches.sort(byTime),
    scannedRepos: scans.length,
  };
}
