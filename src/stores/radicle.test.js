/**
 * Seed-progress tracking in the radicle store: seeding polls
 * radicle_getSeedStatus until the fetch lands or fails, retryFetch
 * restarts a failed fetch, unseed clears tracking.
 */
import { beforeEach, afterEach, describe, expect, test, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

// Fake window.radicle, scripted per test. Must exist before the store
// module evaluates hasProvider().
const provider = { request: vi.fn() };
window.radicle = provider;

const { useRadicleStore } = await import("./radicle.js");

const RID = "rad:z371PVmDHdjJucejRoRYJcDEvD5pp";

const fetchingStatus = (extra = {}) => ({
  rid: RID,
  state: "fetching",
  inStorage: false,
  seedersKnown: 7,
  attemptCount: 0,
  recentAttempts: [],
  lastError: null,
  startedAt: 1,
  finishedAt: null,
  ...extra,
});

let statusScript; // queue of statuses returned by radicle_getSeedStatus

beforeEach(() => {
  setActivePinia(createPinia());
  vi.useFakeTimers();
  statusScript = [];
  provider.request.mockClear();
  provider.request.mockImplementation(async ({ method }) => {
    switch (method) {
      case "radicle_seed":
        return { rid: RID, seeded: true, status: fetchingStatus() };
      case "radicle_sync":
        return { rid: RID, status: fetchingStatus() };
      case "radicle_unseed":
        return { rid: RID, seeded: false };
      case "radicle_getSeedStatus":
        return statusScript.length > 1 ? statusScript.shift() : statusScript[0];
      default:
        throw new Error(`unexpected method ${method}`);
    }
  });
});

afterEach(() => {
  vi.useRealTimers();
});

async function poll(times = 1) {
  for (let i = 0; i < times; i++) await vi.advanceTimersByTimeAsync(2000);
}

describe("seed progress tracking", () => {
  test("seed() records initial status and polls until fetched", async () => {
    const store = useRadicleStore();
    statusScript = [
      fetchingStatus({ attemptCount: 1 }),
      fetchingStatus({ state: "fetched", inStorage: true }),
    ];

    await store.seed(RID);
    expect(store.seedProgress[RID].state).toBe("fetching");
    expect(store.isSeeded(RID)).toBe(true);

    await poll();
    expect(store.seedProgress[RID].attemptCount).toBe(1);

    await poll();
    expect(store.seedProgress[RID].state).toBe("fetched");

    // terminal state → polling stopped
    const calls = provider.request.mock.calls.length;
    await poll(3);
    expect(provider.request.mock.calls.length).toBe(calls);
  });

  test("polling stops on failed; retryFetch restarts it", async () => {
    const store = useRadicleStore();
    statusScript = [
      fetchingStatus({ state: "failed", lastError: "pack error" }),
    ];

    await store.seed(RID);
    await poll();
    expect(store.seedProgress[RID].state).toBe("failed");
    expect(store.seedProgress[RID].lastError).toBe("pack error");

    statusScript = [fetchingStatus({ state: "fetched", inStorage: true })];
    await store.retryFetch(RID);
    expect(store.seedProgress[RID].state).toBe("fetching");
    await poll();
    expect(store.seedProgress[RID].state).toBe("fetched");
  });

  test("unseed clears progress and stops polling", async () => {
    const store = useRadicleStore();
    statusScript = [fetchingStatus()];

    await store.seed(RID);
    await poll();
    await store.unseed(RID);
    expect(store.seedProgress[RID]).toBeUndefined();
    expect(store.isSeeded(RID)).toBe(false);

    const calls = provider.request.mock.calls.length;
    await poll(3);
    expect(provider.request.mock.calls.length).toBe(calls);
  });

  test("resumeTracking picks up an in-flight fetch", async () => {
    const store = useRadicleStore();
    store.connected = true;
    statusScript = [
      fetchingStatus(),
      fetchingStatus({ state: "fetched", inStorage: true }),
    ];

    await store.resumeTracking(RID);
    expect(store.seedProgress[RID].state).toBe("fetching");
    await poll();
    expect(store.seedProgress[RID].state).toBe("fetched");
  });

  test("resumeTracking is a no-op when not connected", async () => {
    const store = useRadicleStore();
    await store.resumeTracking(RID);
    expect(provider.request).not.toHaveBeenCalled();
  });
});
