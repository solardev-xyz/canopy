import { QueryClient } from "@tanstack/vue-query";

/**
 * The app-wide query client, in its own module so non-component code
 * (Pinia stores) can invalidate queries — e.g. when a seeded repository
 * finishes fetching, whichever view initiated it.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Repo data changes only when the node syncs; avoid refetch storms.
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
      // Keep entries around long enough to be worth persisting.
      gcTime: 1000 * 60 * 60 * 24,
    },
  },
});

/** Invalidate every cached query about one repository (rid in the key). */
export function invalidateRepoQueries(rid) {
  queryClient.invalidateQueries({
    predicate: (query) => query.queryKey.includes(rid),
  });
}
