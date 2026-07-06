import { defineStore } from 'pinia';
import { ref } from 'vue';
import { hasProvider, radicleRequest, USER_REJECTED } from '../lib/provider.js';

/**
 * Connection + node state for the window.radicle provider.
 * `available` — running inside Freedom Browser with the provider injected.
 * `connected` — this origin holds a connection grant.
 */
export const useRadicleStore = defineStore('radicle', () => {
  const available = ref(hasProvider());
  const connected = ref(false);
  const capabilities = ref(null);
  const seededRids = ref(new Set());
  const busy = ref(false);

  async function init() {
    // The provider is injected around DOMContentLoaded; a module-script SPA
    // mounts earlier. Poll briefly instead of deciding on first look.
    for (let i = 0; i < 20 && !hasProvider(); i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    available.value = hasProvider();
    if (!available.value) return;
    try {
      capabilities.value = await radicleRequest('radicle_getCapabilities');
      // 'not-connected' means never granted; anything else implies a grant.
      if (capabilities.value.reason !== 'not-connected') {
        connected.value = true;
        await refreshSeeded();
      }
    } catch {
      // Provider present but unresponsive — stay read-only.
    }
  }

  async function connect() {
    if (!available.value) return false;
    try {
      const result = await radicleRequest('radicle_requestAccess');
      connected.value = result.connected === true;
      capabilities.value = result.capabilities ?? capabilities.value;
      await refreshSeeded();
      return connected.value;
    } catch (err) {
      if (err.code === USER_REJECTED) return false;
      throw err;
    }
  }

  async function refreshSeeded() {
    if (!connected.value) return;
    try {
      const repos = await radicleRequest('radicle_listSeededRepos');
      seededRids.value = new Set(repos.map((r) => r.rid));
    } catch {
      // node down — leave the last known set
    }
  }

  function isSeeded(rid) {
    return seededRids.value.has(rid);
  }

  async function seed(rid) {
    busy.value = true;
    try {
      await radicleRequest('radicle_seed', { rid });
      seededRids.value = new Set([...seededRids.value, rid]);
      return true;
    } catch (err) {
      if (err.code === USER_REJECTED) return false;
      throw err;
    } finally {
      busy.value = false;
    }
  }

  async function unseed(rid) {
    busy.value = true;
    try {
      await radicleRequest('radicle_unseed', { rid });
      const next = new Set(seededRids.value);
      next.delete(rid);
      seededRids.value = next;
      return true;
    } finally {
      busy.value = false;
    }
  }

  return {
    available,
    connected,
    capabilities,
    busy,
    init,
    connect,
    refreshSeeded,
    isSeeded,
    seed,
    unseed,
  };
});
