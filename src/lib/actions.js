/**
 * Write actions (signing tier) with query invalidation. All go through
 * window.radicle; the local httpd reflects writes immediately, so we
 * invalidate the relevant queries right after.
 */
import { useQueryClient } from '@tanstack/vue-query';
import { radicleRequest } from './provider.js';

export function useIssueActions(rid) {
  const queryClient = useQueryClient();
  const invalidate = (id) => {
    queryClient.invalidateQueries({ queryKey: ['issues'] });
    if (id) queryClient.invalidateQueries({ queryKey: ['issue'] });
  };

  return {
    async createIssue({ title, description, labels }) {
      const result = await radicleRequest('radicle_createIssue', {
        rid,
        title,
        description,
        ...(labels?.length ? { labels } : {}),
      });
      invalidate();
      return result;
    },
    async commentIssue(issueId, body) {
      const result = await radicleRequest('radicle_commentIssue', { rid, issueId, body });
      invalidate(issueId);
      return result;
    },
    async setIssueState(issueId, state) {
      const result = await radicleRequest('radicle_editIssueState', { rid, issueId, state });
      invalidate(issueId);
      return result;
    },
  };
}

export function usePatchActions(rid) {
  const queryClient = useQueryClient();

  return {
    async commentPatch(patchId, body, revisionId) {
      const result = await radicleRequest('radicle_commentPatch', {
        rid,
        patchId,
        body,
        ...(revisionId ? { revisionId } : {}),
      });
      queryClient.invalidateQueries({ queryKey: ['patch'] });
      queryClient.invalidateQueries({ queryKey: ['patches'] });
      return result;
    },
  };
}
