<script setup>
import { onMounted } from 'vue';
import { useRadicleStore } from '../stores/radicle.js';

const radicle = useRadicleStore();
onMounted(() => radicle.init());
</script>

<template>
  <div v-if="radicle.available" class="shrink-0">
    <button
      v-if="!radicle.connected"
      @click="radicle.connect()"
      class="px-3 py-1.5 text-sm rounded-md font-medium text-white bg-[var(--cnp-btn-primary-bg)] hover:opacity-90 cursor-pointer"
    >
      Connect node
    </button>
    <span
      v-else
      class="inline-flex items-center gap-1.5 text-sm text-fg-muted"
      title="Connected to your Radicle node"
    >
      <span class="w-2 h-2 rounded-full bg-success inline-block" />
      node connected
    </span>
  </div>
</template>
