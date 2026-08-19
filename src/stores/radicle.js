import { defineStore } from "pinia";
import { ref } from "vue";
import { hasProvider, radicleRequest, USER_REJECTED } from "../lib/provider.js";
import { invalidateRepoQueries, queryClient } from "../lib/query-client.js";

/**
 * Connection + node state for the window.radicle provider.
 * `available` — running inside Freedom Browser with the provider injected.
 * `connected` — this origin holds a connection grant.
 * `seedProgress` — per-RID replication status (seeding a repo only writes
 * a policy; the network fetch is asynchronous and reported through provider
 * events, with a one-shot status request used to recover after reload).
 */
export const useRadicleStore = defineStore("radicle", () => {
  const available = ref(hasProvider());
  const connected = ref(false);
  const capabilities = ref(null);
  const alias = ref(null);
  const seededRids = ref(new Set());
  const did = ref(null);
  const busy = ref(false);
  const seedProgress = ref({});

  let providerEventsAttached = false;
  const trackedRids = new Set();

  function applySeedStatus(status) {
    if (!status?.rid) return;
    const previous = seedProgress.value[status.rid];
    if (
      status.state === "fetching" &&
      previous?.state !== "fetching" &&
      previous?.startedAt === status.startedAt
    ) {
      return;
    }
    seedProgress.value[status.rid] = status;
    if (status.state === "fetched" && previous?.state !== "fetched") {
      landed(status.rid);
    }
    if (status.state !== "fetching") trackedRids.delete(status.rid);
  }

  function handleSeedStatus(status) {
    if (trackedRids.has(status?.rid)) applySeedStatus(status);
  }

  function attachProviderEvents() {
    if (providerEventsAttached || typeof window.radicle?.on !== "function") {
      return;
    }
    window.radicle.on("seedStatus", handleSeedStatus);
    providerEventsAttached = true;
  }

  async function init() {
    // The provider is injected around DOMContentLoaded; a module-script SPA
    // mounts earlier. Poll briefly instead of deciding on first look.
    for (let i = 0; i < 20 && !hasProvider(); i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    available.value = hasProvider();
    if (!available.value) return;
    attachProviderEvents();
    try {
      capabilities.value = await radicleRequest("radicle_getCapabilities");
      // 'not-connected' means never granted; anything else implies a grant.
      if (capabilities.value.reason !== "not-connected") {
        connected.value = true;
        await Promise.all([refreshSeeded(), refreshAlias()]);
      }
    } catch {
      // Provider present but unresponsive — stay read-only.
    }
  }

  async function connect() {
    if (!available.value) return false;
    try {
      const result = await radicleRequest("radicle_requestAccess");
      connected.value = result.connected === true;
      capabilities.value = result.capabilities ?? capabilities.value;
      await Promise.all([refreshSeeded(), refreshAlias()]);
      return connected.value;
    } catch (err) {
      if (err.code === USER_REJECTED) return false;
      throw err;
    }
  }

  /** Relinquish this origin's grant entirely (connection + signing). */
  async function disconnect() {
    try {
      await radicleRequest("radicle_disconnect");
    } finally {
      // Whatever the provider said, this session is over locally.
      connected.value = false;
      capabilities.value = null;
      alias.value = null;
      did.value = null;
      seededRids.value = new Set();
      trackedRids.clear();
      seedProgress.value = {};
    }
  }

  async function refreshSeeded() {
    if (!connected.value) return;
    try {
      const repos = await radicleRequest("radicle_listSeededRepos");
      seededRids.value = new Set(repos.map((r) => r.rid));
    } catch {
      // node down — leave the last known set
    }
  }

  // The alias is the public label the user's node gossips to the network;
  // getNodeStatus exposes it at the connection tier.
  async function refreshAlias() {
    try {
      const status = await radicleRequest("radicle_getNodeStatus");
      alias.value = status.alias ?? null;
      // The exact identity arrives once the origin holds the signing
      // grant (nid = did:key without the prefix); until then consumers
      // fall back to resolving the alias via the public index.
      if (status.nid) did.value = `did:key:${status.nid}`;
    } catch {
      // node down — keep whatever we had
    }
  }

  function isSeeded(rid) {
    return seededRids.value.has(rid);
  }

  async function fetchSeedStatus(rid) {
    try {
      return await radicleRequest("radicle_getSeedStatus", { rid });
    } catch {
      return null; // node down — keep the last known status
    }
  }

  /** A repo arrived on the node — refresh everything that lists it. */
  function landed(rid) {
    invalidateRepoQueries(rid);
    queryClient.invalidateQueries({ queryKey: ["seeded-repos"] });
  }

  /** Record a fresh action status and follow the fetch to its outcome. */
  function beginTracking(rid, status) {
    if (!status) return;
    applySeedStatus({ ...status, rid });
  }

  /**
   * Pick up a fetch that's already in flight (e.g. the page was reloaded
   * mid-fetch, or the node is retrying in the background). Observational:
   * an already-fetched repo just gets its status recorded, no refetches.
   */
  async function resumeTracking(rid) {
    if (!connected.value) return;
    trackedRids.add(rid);
    const status = await fetchSeedStatus(rid);
    if (!status) {
      trackedRids.delete(rid);
      return;
    }
    applySeedStatus(status);
  }

  async function seed(rid) {
    busy.value = true;
    trackedRids.add(rid);
    try {
      const result = await radicleRequest("radicle_seed", { rid });
      seededRids.value = new Set([...seededRids.value, rid]);
      beginTracking(rid, result.status);
      return true;
    } catch (err) {
      trackedRids.delete(rid);
      if (err.code === USER_REJECTED) return false;
      throw err;
    } finally {
      busy.value = false;
    }
  }

  /** Restart the network fetch after a failure — no new consent needed. */
  async function retryFetch(rid) {
    trackedRids.add(rid);
    try {
      const result = await radicleRequest("radicle_sync", { rid });
      beginTracking(rid, result.status);
    } catch (err) {
      trackedRids.delete(rid);
      throw err;
    }
  }

  async function unseed(rid) {
    busy.value = true;
    try {
      await radicleRequest("radicle_unseed", { rid });
      const next = new Set(seededRids.value);
      next.delete(rid);
      seededRids.value = next;
      trackedRids.delete(rid);
      delete seedProgress.value[rid];
      queryClient.invalidateQueries({ queryKey: ["seeded-repos"] });
      return true;
    } finally {
      busy.value = false;
    }
  }

  attachProviderEvents();

  return {
    available,
    connected,
    capabilities,
    alias,
    busy,
    did,
    seedProgress,
    init,
    connect,
    disconnect,
    refreshSeeded,
    isSeeded,
    seed,
    retryFetch,
    resumeTracking,
    unseed,
  };
});
