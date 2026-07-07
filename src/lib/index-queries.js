import { computed } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { loadIndexes, getIndexFeeds } from "./index-api.js";

/** The unioned network index from all configured feeds. */
export function useNetworkIndex() {
  return useQuery({
    queryKey: ["network-index", getIndexFeeds()],
    queryFn: () => loadIndexes(),
    staleTime: 5 * 60_000,
    retry: 1,
  });
}

/**
 * Memoized O(1) lookups over the index — the index grows toward the full
 * network (8k+ repos), so views must not linear-scan it per item render.
 */
export function useIndexLookups() {
  const { data: index } = useNetworkIndex();
  const usersByDid = computed(
    () => new Map((index.value?.users ?? []).map((u) => [u.did, u])),
  );
  const reposByRid = computed(
    () => new Map((index.value?.repos ?? []).map((r) => [r.rid, r])),
  );
  return { index, usersByDid, reposByRid };
}
