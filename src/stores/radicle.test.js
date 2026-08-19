/**
 * Seed-progress tracking in the radicle store: seeding consumes pushed
 * seedStatus events, retryFetch restarts a failed fetch, and a one-shot
 * radicle_getSeedStatus snapshot restores state after reload.
 */
import { beforeEach, describe, expect, test, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

// Fake window.radicle, scripted per test. Must exist before the store
// module evaluates hasProvider().
const providerListeners = new Map();
const provider = {
  request: vi.fn(),
  on: vi.fn((event, handler) => providerListeners.set(event, handler)),
};
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

let statusSnapshot;

beforeEach(() => {
  setActivePinia(createPinia());
  statusSnapshot = null;
  providerListeners.clear();
  provider.request.mockClear();
  provider.on.mockClear();
  provider.request.mockImplementation(async ({ method }) => {
    switch (method) {
      case "radicle_seed":
        return { rid: RID, seeded: true, status: fetchingStatus() };
      case "radicle_sync":
        return {
          rid: RID,
          status: fetchingStatus({ attemptCount: 2, startedAt: 2 }),
        };
      case "radicle_unseed":
        return { rid: RID, seeded: false };
      case "radicle_getSeedStatus":
        return statusSnapshot;
      default:
        throw new Error(`unexpected method ${method}`);
    }
  });
});

function emitSeedStatus(status) {
  providerListeners.get("seedStatus")?.(status);
}

describe("seed progress tracking", () => {
  test("seed() records initial status and consumes events until fetched", async () => {
    const store = useRadicleStore();

    await store.seed(RID);
    expect(store.seedProgress[RID].state).toBe("fetching");
    expect(store.isSeeded(RID)).toBe(true);

    emitSeedStatus(fetchingStatus({ attemptCount: 1 }));
    expect(store.seedProgress[RID].attemptCount).toBe(1);

    emitSeedStatus(fetchingStatus({ state: "fetched", inStorage: true }));
    expect(store.seedProgress[RID].state).toBe("fetched");
    expect(provider.request).not.toHaveBeenCalledWith(
      expect.objectContaining({ method: "radicle_getSeedStatus" }),
    );
  });

  test("failed progress can be retried and resumed through events", async () => {
    const store = useRadicleStore();

    await store.seed(RID);
    emitSeedStatus(fetchingStatus({ state: "failed", lastError: "pack error" }));
    expect(store.seedProgress[RID].state).toBe("failed");
    expect(store.seedProgress[RID].lastError).toBe("pack error");

    await store.retryFetch(RID);
    expect(store.seedProgress[RID].state).toBe("fetching");
    emitSeedStatus(
      fetchingStatus({
        state: "fetched",
        inStorage: true,
        attemptCount: 2,
        startedAt: 2,
      }),
    );
    expect(store.seedProgress[RID].state).toBe("fetched");
  });

  test("unseed clears progress and ignores queued events", async () => {
    const store = useRadicleStore();

    await store.seed(RID);
    emitSeedStatus(fetchingStatus({ attemptCount: 1 }));
    await store.unseed(RID);
    expect(store.seedProgress[RID]).toBeUndefined();
    expect(store.isSeeded(RID)).toBe(false);

    emitSeedStatus(fetchingStatus({ state: "fetched", inStorage: true }));
    expect(store.seedProgress[RID]).toBeUndefined();
  });

  test("resumeTracking takes one snapshot then follows pushed events", async () => {
    const store = useRadicleStore();
    store.connected = true;
    statusSnapshot = fetchingStatus();

    await store.resumeTracking(RID);
    expect(store.seedProgress[RID].state).toBe("fetching");
    emitSeedStatus(fetchingStatus({ state: "fetched", inStorage: true }));
    expect(store.seedProgress[RID].state).toBe("fetched");
    expect(
      provider.request.mock.calls.filter(
        ([request]) => request.method === "radicle_getSeedStatus",
      ),
    ).toHaveLength(1);
  });

  test("resumeTracking is a no-op when not connected", async () => {
    const store = useRadicleStore();
    await store.resumeTracking(RID);
    expect(provider.request).not.toHaveBeenCalled();
  });
});
