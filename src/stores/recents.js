import { defineStore } from "pinia";
import { ref } from "vue";

const KEY = "canopy.recent-repos";
const MAX = 8;

/** Recently visited repos, persisted to localStorage. */
export const useRecentsStore = defineStore("recents", () => {
  const recents = ref(load());

  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) ?? [];
    } catch {
      return [];
    }
  }

  function remember({ rid, name, description }) {
    const rest = recents.value.filter((r) => r.rid !== rid);
    recents.value = [{ rid, name, description, at: Date.now() }, ...rest].slice(
      0,
      MAX,
    );
    try {
      localStorage.setItem(KEY, JSON.stringify(recents.value));
    } catch {
      // storage full/blocked — recents just won't persist
    }
  }

  return { recents, remember };
});
