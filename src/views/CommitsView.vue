<script setup>
import { computed, ref } from 'vue';
import { useCommits } from '../lib/queries.js';
import { formatTimestamp } from '../lib/rad-api.js';
import LoadingBar from '../components/LoadingBar.vue';
import ErrorBox from '../components/ErrorBox.vue';
import AuthorChip from '../components/AuthorChip.vue';

const props = defineProps({ repo: { type: Object, required: true } });
const rid = computed(() => props.repo.rid);
const page = ref(0);
const PER_PAGE = 30;

const {
  data: commits,
  isPending,
  error,
} = useCommits(rid, computed(() => props.repo.head), page, PER_PAGE);
</script>

<template>
  <div>
    <LoadingBar v-if="isPending" />
    <ErrorBox v-else-if="error" title="Could not load commits" :error="error" />
    <template v-else-if="commits">
      <div class="border border-border-default rounded-md overflow-hidden">
        <div
          v-for="c in commits"
          :key="c.id"
          class="px-4 py-3 border-b border-border-muted last:border-0 hover:bg-canvas-subtle flex items-center gap-3"
        >
          <div class="min-w-0 flex-1">
            <RouterLink
              :to="{ name: 'commit', params: { rid, sha: c.id } }"
              class="font-semibold hover:text-accent hover:underline block truncate"
            >
              {{ c.summary }}
            </RouterLink>
            <div class="text-xs text-fg-muted mt-1 flex items-center gap-1.5">
              <AuthorChip :name="c.author?.name" />
              <span>committed {{ formatTimestamp(c.committer?.time ?? c.author?.time) }}</span>
            </div>
          </div>
          <RouterLink
            :to="{ name: 'commit', params: { rid, sha: c.id } }"
            class="font-mono text-xs text-fg-muted border border-border-default rounded-md px-2 py-1 hover:text-accent shrink-0"
          >
            {{ c.id.slice(0, 7) }}
          </RouterLink>
        </div>
      </div>
      <div class="flex justify-between mt-4">
        <button
          :disabled="page === 0"
          @click="page--"
          class="px-3 py-1.5 text-sm border border-border-default rounded-md disabled:opacity-40 hover:bg-canvas-subtle cursor-pointer disabled:cursor-default"
        >
          ← Newer
        </button>
        <button
          :disabled="commits.length < PER_PAGE"
          @click="page++"
          class="px-3 py-1.5 text-sm border border-border-default rounded-md disabled:opacity-40 hover:bg-canvas-subtle cursor-pointer disabled:cursor-default"
        >
          Older →
        </button>
      </div>
    </template>
  </div>
</template>
