import { describe, test, expect, beforeAll } from "vitest";
import {
  configureRadApi,
  parseRepoInfo,
  normalizeRid,
  shortDid,
  getRepo,
  getTree,
  getBlob,
  getReadme,
  getCommits,
  getCommit,
  getIssues,
  getIssue,
  getPatches,
  getRemotes,
  RadApiError,
} from "./rad-api.js";

const HTTPD = process.env.CANOPY_HTTPD ?? "http://127.0.0.1:8788";
const HEARTWOOD = "rad:z3gqcJUoA1n9HaHKufZs5FCSGazv5";

describe("normalizeRid", () => {
  test.each([
    ["rad:z3gqcJUoA1n9HaHKufZs5FCSGazv5", HEARTWOOD],
    ["rad://z3gqcJUoA1n9HaHKufZs5FCSGazv5", HEARTWOOD],
    ["z3gqcJUoA1n9HaHKufZs5FCSGazv5", HEARTWOOD],
    ["  rad:z3gqcJUoA1n9HaHKufZs5FCSGazv5  ", HEARTWOOD],
    ["rad://z3gqcJUoA1n9HaHKufZs5FCSGazv5/tree/main", HEARTWOOD],
    ["not-a-rid", null],
    ["rad:z0OIl", null],
    ["", null],
    [null, null],
  ])("normalizeRid(%j) -> %j", (input, expected) => {
    expect(normalizeRid(input)).toBe(expected);
  });
});

describe("shortDid", () => {
  test("shortens a did:key", () => {
    const out = shortDid(
      "did:key:z6MkireRatUThvd3qzfKht1S44wpm4FEWSSa4PRMTSQZ3voM",
    );
    expect(out).toMatch(/^z6Mkir.*….*Z3voM$/);
    expect(out.length).toBeLessThan(25);
  });
});

describe("parseRepoInfo", () => {
  test("extracts project payload fields", () => {
    const raw = {
      rid: HEARTWOOD,
      payloads: {
        "xyz.radicle.project": {
          data: {
            name: "heartwood",
            description: "desc",
            defaultBranch: "master",
          },
          meta: { head: "abc123" },
        },
      },
      delegates: [{ id: "did:key:z6MkA" }, "did:key:z6MkB"],
      threshold: 2,
      visibility: { type: "public" },
      seeding: 12,
    };
    expect(parseRepoInfo(raw)).toEqual({
      rid: HEARTWOOD,
      name: "heartwood",
      description: "desc",
      defaultBranch: "master",
      head: "abc123",
      delegates: ["did:key:z6MkA", "did:key:z6MkB"],
      threshold: 2,
      visibility: "public",
      seeding: 12,
    });
  });
});

// ---------------------------------------------------------------------------
// Integration — requires the dev node (npm run dev:node) with heartwood
// seeded. Skips loudly when the node is down so unit tests stay green.

let nodeUp = false;
try {
  const res = await fetch(`${HTTPD}/api/v1`, {
    signal: AbortSignal.timeout(2000),
  });
  nodeUp = res.ok;
} catch {
  nodeUp = false;
}

if (!nodeUp) {
  console.warn(
    `\n[rad-api.test] dev node not reachable at ${HTTPD} — integration tests skipped.` +
      `\n              Start it with \`npm run dev:node\`.\n`,
  );
}

describe.runIf(nodeUp)("integration against local httpd", () => {
  beforeAll(() => {
    configureRadApi({ base: `${HTTPD}/api/v1/repos/`, mode: "proxy" });
  });

  test("getRepo returns normalized heartwood info", async () => {
    const repo = await getRepo(HEARTWOOD);
    expect(repo.name).toBe("heartwood");
    expect(repo.defaultBranch).toBe("master");
    expect(repo.head).toMatch(/^[0-9a-f]{40}$/);
    expect(repo.delegates.length).toBeGreaterThan(0);
  });

  test("getTree returns entries with kind tree/blob", async () => {
    const { head } = await getRepo(HEARTWOOD);
    const tree = await getTree(HEARTWOOD, head);
    expect(tree.entries.length).toBeGreaterThan(0);
    const kinds = new Set(tree.entries.map((e) => e.kind));
    expect(kinds.has("tree")).toBe(true);
    expect(kinds.has("blob")).toBe(true);
  });

  test("getTree of a subdirectory", async () => {
    const { head } = await getRepo(HEARTWOOD);
    const tree = await getTree(HEARTWOOD, head, "crates");
    expect(tree.entries.some((e) => e.name.startsWith("radicle"))).toBe(true);
  });

  test("getBlob returns file content", async () => {
    const { head } = await getRepo(HEARTWOOD);
    const blob = await getBlob(HEARTWOOD, head, "Cargo.toml");
    expect(blob.binary).toBe(false);
    expect(blob.content).toContain("[workspace");
  });

  test("getReadme returns the README", async () => {
    const { head } = await getRepo(HEARTWOOD);
    const readme = await getReadme(HEARTWOOD, head);
    expect(readme.name.toLowerCase()).toContain("readme");
    expect(readme.content.length).toBeGreaterThan(100);
  });

  test("getCommits paginates", async () => {
    const { head } = await getRepo(HEARTWOOD);
    const commits = await getCommits(HEARTWOOD, { parent: head, perPage: 5 });
    expect(commits.length).toBe(5);
    expect(commits[0].id).toBe(head);
    expect(commits[0].summary).toBeTruthy();
  });

  test("getCommit returns structured diff", async () => {
    const { head } = await getRepo(HEARTWOOD);
    const detail = await getCommit(HEARTWOOD, head);
    expect(detail.commit.id).toBe(head);
    expect(Array.isArray(detail.diff.files)).toBe(true);
  });

  test("getIssues state filter actually filters (httpd param is `status`)", async () => {
    const closed = await getIssues(HEARTWOOD, { state: "closed", perPage: 50 });
    expect(closed.length).toBeGreaterThan(0);
    expect(closed.every((i) => i.state.status === "closed")).toBe(true);
  });

  test("getIssues + getIssue round-trip", async () => {
    const issues = await getIssues(HEARTWOOD, { state: "open", perPage: 3 });
    expect(issues.length).toBeGreaterThan(0);
    const issue = await getIssue(HEARTWOOD, issues[0].id);
    expect(issue.title).toBe(issues[0].title);
    expect(Array.isArray(issue.discussion)).toBe(true);
  });

  test("getPatches + revisions shape", async () => {
    const patches = await getPatches(HEARTWOOD, { state: "open", perPage: 3 });
    expect(patches.length).toBeGreaterThan(0);
    expect(patches[0].revisions.length).toBeGreaterThan(0);
    expect(patches[0].revisions[0]).toHaveProperty("oid");
    expect(patches[0].revisions[0]).toHaveProperty("base");
  });

  test("getRemotes lists delegate heads", async () => {
    const remotes = await getRemotes(HEARTWOOD);
    expect(remotes.length).toBeGreaterThan(0);
    expect(remotes[0]).toHaveProperty("heads");
  });

  test("unknown repo rejects with RadApiError", async () => {
    await expect(
      getRepo("rad:z2u2CV5ZVVXfwamqLtwSZfWJGnWWW"),
    ).rejects.toBeInstanceOf(RadApiError);
  });
});
