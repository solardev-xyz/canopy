<script setup>
defineProps({
  title: { type: String, default: 'Something went wrong' },
  error: { type: [Object, Error], default: null },
});
</script>

<template>
  <div class="my-8 mx-auto max-w-lg border border-border-default rounded-md p-6 text-center">
    <div class="text-lg font-semibold mb-1">{{ title }}</div>
    <div v-if="error" class="text-sm text-fg-muted">{{ error.message }}</div>
    <slot />
  </div>
</template>
