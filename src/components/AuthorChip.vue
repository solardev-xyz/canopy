<script setup>
import { computed } from 'vue';
import { shortDid } from '../lib/rad-api.js';

const props = defineProps({
  author: { type: Object, default: null }, // { id: did, alias? }
  name: { type: String, default: null }, // plain git author name
});

const label = computed(() => {
  if (props.name) return props.name;
  if (props.author?.alias) return props.author.alias;
  return shortDid(props.author?.id ?? '');
});

// Stable pastel from the identity — poor man's identicon.
const hue = computed(() => {
  const s = props.author?.id ?? props.name ?? '';
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
});
</script>

<template>
  <span class="inline-flex items-center gap-1.5 font-semibold text-fg-default">
    <span
      class="w-4 h-4 rounded-full inline-block shrink-0 border border-border-muted"
      :style="{ background: `hsl(${hue} 65% 55%)` }"
    />
    {{ label }}
  </span>
</template>
