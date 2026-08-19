/**
 * TanStack Query composables over the rad-api data layer.
 * All arguments are refs/computeds so queries re-run on route changes.
 */
import { computed, unref } from "vue";
import { useQuery } from "@tanstack/vue-query";
import * as api from "./rad-api.js";

const enabled = (...vals) => computed(() => vals.every((v) => !!unref(v)));

export function useRepo(rid) {
  return useQuery({
    queryKey: ["repo", rid],
    queryFn: () => api.getRepo(unref(rid)),
    enabled: enabled(rid),
  });
}

export function useTree(rid, sha, path) {
  return useQuery({
    queryKey: ["tree", rid, sha, path],
    queryFn: () => api.getTree(unref(rid), unref(sha), unref(path) || ""),
    enabled: enabled(rid, sha),
  });
}

export function useBlob(rid, sha, path) {
  return useQuery({
    queryKey: ["blob", rid, sha, path],
    queryFn: () => api.getBlob(unref(rid), unref(sha), unref(path)),
    enabled: enabled(rid, sha, path),
  });
}

export function useReadme(rid, sha) {
  return useQuery({
    queryKey: ["readme", rid, sha],
    queryFn: () => api.getReadme(unref(rid), unref(sha)),
    enabled: enabled(rid, sha),
    retry: false, // repos without a README 404 — that's fine
  });
}

export function useRepoStats(rid, sha) {
  return useQuery({
    queryKey: ["repo-stats", rid, sha],
    queryFn: () => api.getRepoStats(unref(rid), unref(sha)),
    enabled: enabled(rid, sha),
    retry: false,
  });
}

export function useCommits(rid, parent, page = 0, perPage = 30) {
  return useQuery({
    queryKey: ["commits", rid, parent, page, perPage],
    queryFn: () =>
      api.getCommits(unref(rid), {
        parent: unref(parent),
        page: unref(page),
        perPage: unref(perPage),
      }),
    enabled: enabled(rid, parent),
    placeholderData: (prev) => prev,
  });
}

export function useCommit(rid, sha) {
  return useQuery({
    queryKey: ["commit", rid, sha],
    queryFn: () => api.getCommit(unref(rid), unref(sha)),
    enabled: enabled(rid, sha),
  });
}

export function useIssues(rid, state) {
  return useQuery({
    queryKey: ["issues", rid, state],
    queryFn: () =>
      api.getIssues(unref(rid), { state: unref(state), perPage: 100 }),
    enabled: enabled(rid),
    placeholderData: (prev) => prev,
  });
}

export function useIssue(rid, id) {
  return useQuery({
    queryKey: ["issue", rid, id],
    queryFn: () => api.getIssue(unref(rid), unref(id)),
    enabled: enabled(rid, id),
  });
}

export function usePatches(rid, state) {
  return useQuery({
    queryKey: ["patches", rid, state],
    queryFn: () =>
      api.getPatches(unref(rid), { state: unref(state), perPage: 100 }),
    enabled: enabled(rid),
    placeholderData: (prev) => prev,
  });
}

export function usePatch(rid, id) {
  return useQuery({
    queryKey: ["patch", rid, id],
    queryFn: () => api.getPatch(unref(rid), unref(id)),
    enabled: enabled(rid, id),
  });
}
