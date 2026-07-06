<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useIssue } from '../lib/queries.js';
import { formatTimestamp, shortDid } from '../lib/rad-api.js';
import LoadingBar from '../components/LoadingBar.vue';
import ErrorBox from '../components/ErrorBox.vue';
import StateBadge from '../components/StateBadge.vue';
import CommentCard from '../components/CommentCard.vue';

const props = defineProps({ repo: { type: Object, required: true } });
const route = useRoute();
const rid = computed(() => props.repo.rid);
const id = computed(() => route.params.id);

const { data: issue, isPending, error } = useIssue(rid, id);
</script>

<template>
  <div class="max-w-4xl">
    <LoadingBar v-if="isPending" />
    <ErrorBox v-else-if="error" title="Could not load issue" :error="error" />
    <template v-else-if="issue">
      <div class="pb-4 border-b border-border-default mb-4">
        <h1 class="text-2xl mb-2">
          {{ issue.title }}
          <span class="text-fg-muted font-mono text-base">#{{ issue.id.slice(0, 7) }}</span>
        </h1>
        <div class="flex items-center gap-2 text-sm text-fg-muted flex-wrap">
          <StateBadge kind="issue" :state="issue.state" />
          <span>
            <span class="font-semibold text-fg-default">
              {{ issue.author.alias ?? shortDid(issue.author.id) }}
            </span>
            opened this issue {{ formatTimestamp(issue.discussion?.[0]?.timestamp) }} ·
            {{ issue.discussion.length }} comment{{ issue.discussion.length === 1 ? '' : 's' }}
          </span>
          <span
            v-for="label in issue.labels"
            :key="label"
            class="text-xs px-2 py-0.5 rounded-full border border-border-default"
          >
            {{ label }}
          </span>
        </div>
      </div>

      <div class="space-y-4">
        <CommentCard v-for="c in issue.discussion" :key="c.id" :comment="c" />
      </div>
    </template>
  </div>
</template>
