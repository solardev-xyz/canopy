import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import {
  searchRepos,
  searchUsers,
  isSwarmRef,
  loadIndexes,
  DEFAULT_INDEX_FEED,
} from "./index-api.js";

const repo = (rid, name, extra = {}) => ({
  rid,
  name,
  description: "",
  seeders: 0,
  issues: { open: 0, closed: 0 },
  patches: { open: 0, draft: 0, merged: 0, archived: 0 },
  lastActivity: 0,
  ...extra,
});

describe("isSwarmRef", () => {
  test.each([
    [DEFAULT_INDEX_FEED, true],
    ["E1C89773D235C0539B700B4248014D83AA7CBCFEB8769DC761B633FF4E0DCADC", true],
    ["bzz://abc", false],
    ["zzz", false],
    [null, false],
  ])("%j -> %j", (input, expected) => {
    expect(isSwarmRef(input)).toBe(expected);
  });
});

describe("searchRepos", () => {
  const repos = [
    repo("rad:za", "heartwood", { description: "Radicle protocol" }),
    repo("rad:zb", "canopy", { description: "forge UI" }),
  ];
  test("matches name, description, and rid, case-insensitively", () => {
    expect(searchRepos(repos, "HEART")).toHaveLength(1);
    expect(searchRepos(repos, "forge")[0].name).toBe("canopy");
    expect(searchRepos(repos, "rad:zb")[0].name).toBe("canopy");
    expect(searchRepos(repos, "  ")).toHaveLength(2);
    expect(searchRepos(repos, "nope")).toHaveLength(0);
  });
});

describe("searchUsers", () => {
  const users = [
    {
      did: "did:key:z6MkAAA",
      alias: "cloudhead",
      maintains: [],
      issues: 1,
      patches: 0,
    },
    {
      did: "did:key:z6MkBBB",
      alias: null,
      maintains: [],
      issues: 0,
      patches: 0,
    },
  ];
  test("matches alias and did; empty query returns nothing", () => {
    expect(searchUsers(users, "cloud")).toHaveLength(1);
    expect(searchUsers(users, "z6mkbbb")).toHaveLength(1);
    expect(searchUsers(users, "")).toHaveLength(0);
    expect(searchUsers(users, "nobody")).toHaveLength(0);
  });
});

describe("loadIndexes union", () => {
  const A = "a".repeat(64);
  const B = "b".repeat(64);

  const snapshots = {
    [A]: {
      manifest: {
        schema: "radicle-index/1",
        generatedAt: 100,
        network: { knownRepos: 10, indexedRepos: 2, users: 1 },
        shards: { repos: ["repos.json"], users: ["users.json"] },
      },
      "repos.json": [repo("rad:z1", "old-name"), repo("rad:z2", "only-in-a")],
      "users.json": [
        {
          did: "did:key:zU",
          alias: null,
          maintains: [],
          issues: 1,
          patches: 0,
        },
      ],
    },
    [B]: {
      manifest: {
        schema: "radicle-index/1",
        generatedAt: 200,
        network: { knownRepos: 12, indexedRepos: 1, users: 1 },
        shards: { repos: ["repos.json"], users: ["users.json"] },
      },
      "repos.json": [repo("rad:z1", "new-name", { lastActivity: 5 })],
      "users.json": [
        {
          did: "did:key:zU",
          alias: "alice",
          maintains: [],
          issues: 9,
          patches: 0,
        },
      ],
    },
  };

  beforeEach(() => {
    vi.stubGlobal("window", { radicle: { isFreedomBrowser: true } });
    vi.stubGlobal("fetch", async (url) => {
      const m = /^bzz:\/\/([0-9a-f]{64})\/(.+)$/.exec(url);
      const body =
        m && snapshots[m[1]]?.[m[2] === "manifest.json" ? "manifest" : m[2]];
      if (!body) return { ok: false, status: 404 };
      return { ok: true, json: async () => body };
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  test("unions feeds; newer generatedAt wins per rid and did", async () => {
    const result = await loadIndexes([A, B]);
    expect(result.available).toBe(true);
    expect(result.repos.map((r) => r.name).sort()).toEqual([
      "new-name",
      "only-in-a",
    ]);
    expect(result.users[0].alias).toBe("alice");
    expect(result.manifests).toHaveLength(2);
  });

  test("skips unreachable feeds, reports errors", async () => {
    const result = await loadIndexes([A, "c".repeat(64)]);
    expect(result.available).toBe(true);
    expect(result.repos).toHaveLength(2);
    expect(result.errors).toHaveLength(1);
  });
});
