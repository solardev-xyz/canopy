<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useCommit } from '../lib/queries.js';
import { formatTimestamp } from '../lib/rad-api.js';
import LoadingBar from '../components/LoadingBar.vue';
import ErrorBox from '../components/ErrorBox.vue';
import AuthorChip from '../components/AuthorChip.vue';
import DiffFile from '../components/DiffFile.vue';

const props = defineProps({ repo: { type: Object, required: true } });
const route = useRoute();
const rid = computed(() => props.repo.rid);
const sha = computed(() => route.params.sha);

const { data, isPending, error } = useCommit(rid, sha);

const stats = computed(() => data.value?.diff?.stats ?? null);
const files = computed(() => data.value?.diff?.files ?? []);
</script>

<template>
  <div>
    <LoadingBar v-if="isPending" />
    <ErrorBox v-else-if="error" title="Could not load commit" :error="error" />
    <template v-else-if="data">
      <div class="border border-border-default rounded-md p-4 mb-4">
        <h1 class="text-lg font-semibold mb-1">{{ data.commit.summary }}</h1>
        <pre
          v-if="data.commit.description"
          class="text-sm text-fg-muted whitespace-pre-wrap mb-3 font-sans"
          >{{ data.commit.description.trim() }}</pre
        >
        <div class="text-xs text-fg-muted flex items-center gap-1.5 flex-wrap">
          <AuthorChip :name="data.commit.author?.name" />
          <span>committed {{ formatTimestamp(data.commit.committer?.time) }}</span>
          <span class="font-mono ml-auto">{{ data.commit.id }}</span>
        </div>
      </div>

      <div v-if="stats" class="text-sm text-fg-muted mb-3">
        {{ files.length }} file{{ files.length === 1 ? '' : 's' }} changed
        <span class="text-success font-semibold">+{{ stats.insertions }}</span>
        <span class="text-danger font-semibold">−{{ stats.deletions }}</span>
      </div>

      <div class="space-y-4">
        <DiffFile v-for="(file, i) in files" :key="i" :file="file" />
      </div>
    </template>
  </div>
</template>
