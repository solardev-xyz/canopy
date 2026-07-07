<script setup>
import { computed } from "vue";
import { shortDid } from "../lib/rad-api.js";
import { hueFromId } from "../lib/identicon.js";

const props = defineProps({
  author: { type: Object, default: null }, // { id: did, alias? }
  name: { type: String, default: null }, // plain git author name
});

const label = computed(() => {
  if (props.name) return props.name;
  if (props.author?.alias) return props.author.alias;
  return shortDid(props.author?.id ?? "");
});

// Radicle identities (DIDs) link to their identity page; plain git author
// names have no DID to link to.
const did = computed(() => props.author?.id ?? null);
const hue = computed(() => hueFromId(did.value ?? props.name ?? ""));
</script>

<template>
  <component
    :is="did ? 'RouterLink' : 'span'"
    :to="did ? { name: 'user', params: { did } } : undefined"
    :class="[
      'inline-flex items-center gap-1.5 font-semibold text-fg-default',
      did && 'hover:text-accent hover:underline',
    ]"
  >
    <span
      class="w-4 h-4 rounded-full inline-block shrink-0 border border-border-muted"
      :style="{ background: `hsl(${hue} 65% 55%)` }"
    />
    {{ label }}
  </component>
</template>
