import { describe, test, expect, beforeAll } from "vitest";
import { configureRadApi } from "./rad-api.js";
import {
  normalizeDid,
  dedupeRepos,
  scanRepoForDid,
  buildProfile,
} from "./profile.js";

const HTTPD = process.env.CANOPY_HTTPD ?? "http://127.0.0.1:8788";
const HEARTWOOD = "rad:z3gqcJUoA1n9HaHKufZs5FCSGazv5";
// Heartwood delegate who also authors issues — a rich real-world fixture.
const CLOUDHEAD = "did:key:z6MkireRatUThvd3qzfKht1S44wpm4FEWSSa4PRMTSQZ3voM";

describe("normalizeDid", () => {
  const KEY = "z6MkireRatUThvd3qzfKht1S44wpm4FEWSSa4PRMTSQZ3voM";
  test.each([
    [`did:key:${KEY}`, `did:key:${KEY}`],
    [KEY, `did:key:${KEY}`],
    [`  did:key:${KEY}  `, `did:key:${KEY}`],
    ["did:key:tooshort", null],
    ["not-a-did", null],
    [null, null],
  ])("normalizeDid(%j) -> %j", (input, expected) => {
    expect(normalizeDid(input)).toBe(expected);
  });
});

describe("dedupeRepos", () => {
  test("merges lists, dedupes by rid, preserves order", () => {
    const out = dedupeRepos(
      [{ rid: "rad:za" }, { rid: "rad:zb" }],
      [{ rid: "rad:za", name: "dupe" }, { rid: "rad:zc" }],
      [null, { norid: true }],
    );
    expect(out.map((r) => r.rid)).toEqual(["rad:za", "rad:zb", "rad:zc"]);
  });

  test("caps the candidate list", () => {
    const many = Array.from({ length: 50 }, (_, i) => ({ rid: `rad:z${i}` }));
    expect(dedupeRepos(many).length).toBeLessThanOrEqual(20);
  });
});

// ---------------------------------------------------------------------------
// Integration — real heartwood data on the dev node.

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
    `\n[profile.test] dev node not reachable at ${HTTPD} — integration skipped.\n`,
  );
}

describe.runIf(nodeUp)("profile assembly against local httpd", () => {
  beforeAll(() => {
    configureRadApi({ base: `${HTTPD}/api/v1/repos/`, mode: "proxy" });
  });

  test("scanRepoForDid finds delegate role and authored issues", async () => {
    const scan = await scanRepoForDid(HEARTWOOD, CLOUDHEAD);
    expect(scan.isDelegate).toBe(true);
    expect(scan.issues.length).toBeGreaterThan(0);
    expect(scan.issues.every((i) => i.author.id === CLOUDHEAD)).toBe(true);
  });

  test("scanRepoForDid returns null for unavailable repos", async () => {
    const scan = await scanRepoForDid(
      "rad:z2u2CV5ZVVXfwamqLtwSZfWJGnWWW",
      CLOUDHEAD,
    );
    expect(scan).toBeNull();
  });

  test("buildProfile aggregates across candidates, skipping missing repos", async () => {
    const profile = await buildProfile(CLOUDHEAD, [
      { rid: HEARTWOOD },
      { rid: "rad:z2u2CV5ZVVXfwamqLtwSZfWJGnWWW" }, // not on this node
    ]);
    expect(profile.scannedRepos).toBe(1);
    expect(profile.maintains.map((r) => r.rid)).toContain(HEARTWOOD);
    expect(profile.issues.length).toBeGreaterThan(0);
    expect(profile.issues[0].repo.name).toBe("heartwood");
  });

  test("buildProfile is empty for an unknown identity", async () => {
    const nobody = "did:key:z6MkhuKdMW5dXPVAn4Tv6F8kophJ9BfXvSUjKaFAW9eegC2h";
    const profile = await buildProfile(nobody, [{ rid: HEARTWOOD }]);
    expect(profile.maintains).toEqual([]);
    expect(profile.issues).toEqual([]);
  });
});
