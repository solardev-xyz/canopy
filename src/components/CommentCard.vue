<script setup>
import AuthorChip from './AuthorChip.vue';
import MarkdownBody from './MarkdownBody.vue';
import { formatTimestamp } from '../lib/rad-api.js';

defineProps({
  comment: { type: Object, required: true }, // { author, body, timestamp }
});
</script>

<template>
  <div class="border border-border-default rounded-md">
    <div
      class="flex items-center gap-2 px-4 py-2 bg-canvas-subtle border-b border-border-default rounded-t-md text-sm"
    >
      <AuthorChip :author="comment.author" />
      <span class="text-fg-muted">commented {{ formatTimestamp(comment.timestamp) }}</span>
    </div>
    <div class="px-4 py-3">
      <MarkdownBody :source="comment.body" />
    </div>
  </div>
</template>
