<script setup>
import { computed } from 'vue';

const props = defineProps({
  kind: { type: String, required: true }, // 'issue' | 'patch'
  state: { type: Object, required: true }, // { status, reason? }
});

const config = computed(() => {
  const s = props.state?.status;
  if (props.kind === 'issue') {
    if (s === 'open') return { label: 'Open', cls: 'bg-success-emphasis', icon: '⊙' };
    return { label: 'Closed', cls: 'bg-done', icon: '⊘' };
  }
  // patch
  if (s === 'open') return { label: 'Open', cls: 'bg-success-emphasis', icon: '⎇' };
  if (s === 'draft') return { label: 'Draft', cls: 'bg-fg-muted', icon: '⎇' };
  if (s === 'merged') return { label: 'Merged', cls: 'bg-done', icon: '⎇' };
  return { label: 'Archived', cls: 'bg-danger', icon: '⎇' };
});
</script>

<template>
  <span
    :class="[
      'inline-flex items-center gap-1 px-3 py-1 rounded-full text-white text-sm font-medium',
      config.cls,
    ]"
  >
    <span aria-hidden="true">{{ config.icon }}</span>
    {{ config.label }}
  </span>
</template>
