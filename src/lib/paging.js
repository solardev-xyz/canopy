import { computed, ref, unref, watch } from "vue";

/**
 * Client-side filter + pagination over an in-memory list (index data and
 * profile scans are already fully local — no server paging exists in a
 * p2p setting, so slicing here is the honest model).
 *
 * The returned object is the single prop PagerBar takes.
 *
 * @param {import('vue').Ref<Array>|Array} source - the full item list
 * @param {{pageSize?: number, match?: (item, query: string) => boolean}} options
 *   `match` receives the lowercased, trimmed query (never empty).
 */
export function usePagedList(source, { pageSize = 20, match } = {}) {
  const query = ref("");
  const page = ref(0);

  const filtered = computed(() => {
    const items = unref(source) ?? [];
    const q = query.value.trim().toLowerCase();
    if (!q || !match) return items;
    return items.filter((item) => match(item, q));
  });

  const totalPages = computed(() =>
    Math.max(1, Math.ceil(filtered.value.length / pageSize)),
  );

  // A new filter resets the page; a shrunk list clamps it.
  watch(query, () => (page.value = 0));
  watch(totalPages, (n) => {
    if (page.value > n - 1) page.value = 0;
  });

  const items = computed(() => {
    const start = page.value * pageSize;
    return filtered.value.slice(start, start + pageSize);
  });

  return {
    query,
    page,
    items,
    total: computed(() => filtered.value.length),
    totalPages,
    // Whether paging controls earn their space (the filter may still be
    // wanted while a query is active even if results now fit one page).
    needed: computed(
      () => (unref(source)?.length ?? 0) > pageSize || query.value !== "",
    ),
    next: () => {
      if (page.value < totalPages.value - 1) page.value += 1;
    },
    prev: () => {
      if (page.value > 0) page.value -= 1;
    },
  };
}
