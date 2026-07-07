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
