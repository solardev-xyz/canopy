<script setup>
import { computed, ref } from 'vue';
import { useIssues } from '../lib/queries.js';
import { formatTimestamp, shortDid } from '../lib/rad-api.js';
import LoadingBar from '../components/LoadingBar.vue';
import ErrorBox from '../components/ErrorBox.vue';
import NewIssueForm from '../components/NewIssueForm.vue';
import { useRadicleStore } from '../stores/radicle.js';

const props = defineProps({ repo: { type: Object, required: true } });
const rid = computed(() => props.repo.rid);
const state = ref('open');
const showNewIssue = ref(false);
const radicle = useRadicleStore();

const { data: issues, isPending, error } = useIssues(rid, state);
</script>

<template>
  <div>
    <div class="flex gap-4 mb-3 text-sm items-center">
      <button
        v-for="s in ['open', 'closed']"
        :key="s"
        @click="state = s"
        :class="[
          'cursor-pointer capitalize',
          state === s ? 'font-semibold' : 'text-fg-muted hover:text-fg-default',
        ]"
      >
        <span aria-hidden="true">{{ s === 'open' ? '⊙' : '⊘' }}</span>
        {{ s }}
      </button>
      <button
        v-if="radicle.available && radicle.connected && !showNewIssue"
        @click="showNewIssue = true"
        class="ml-auto px-3 py-1.5 rounded-md font-medium text-white bg-[var(--cnp-btn-primary-bg)] hover:opacity-90 cursor-pointer"
      >
        New issue
      </button>
    </div>

    <NewIssueForm v-if="showNewIssue" :rid="rid" @close="showNewIssue = false" />

    <LoadingBar v-if="isPending" />
    <ErrorBox v-else-if="error" title="Could not load issues" :error="error" />
    <div v-else-if="issues?.length === 0" class="py-16 text-center text-fg-muted">
      No {{ state }} issues.
    </div>
    <div v-else-if="issues" class="border border-border-default rounded-md overflow-hidden">
      <div
        v-for="issue in issues"
        :key="issue.id"
        class="px-4 py-2.5 border-b border-border-muted last:border-0 hover:bg-canvas-subtle flex gap-3"
      >
        <span
          :class="['mt-0.5', issue.state.status === 'open' ? 'text-success' : 'text-done']"
          aria-hidden="true"
        >
          {{ issue.state.status === 'open' ? '⊙' : '⊘' }}
        </span>
        <div class="min-w-0 flex-1">
          <RouterLink
            :to="{ name: 'issue', params: { rid, id: issue.id } }"
            class="font-semibold hover:text-accent block"
          >
            {{ issue.title }}
            <span
              v-for="label in issue.labels"
              :key="label"
              class="ml-1 text-xs font-normal px-2 py-0.5 rounded-full border border-border-default text-fg-muted"
            >
              {{ label }}
            </span>
          </RouterLink>
          <div class="text-xs text-fg-muted mt-0.5">
            opened {{ formatTimestamp(issue.discussion?.[0]?.timestamp) }} by
            {{ issue.author.alias ?? shortDid(issue.author.id) }}
          </div>
        </div>
        <span
          v-if="(issue.discussion?.length ?? 0) > 1"
          class="text-xs text-fg-muted shrink-0 mt-1"
        >
          💬 {{ issue.discussion.length - 1 }}
        </span>
      </div>
    </div>
  </div>
</template>
