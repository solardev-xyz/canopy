<script setup>
import { computed } from 'vue';
import { renderMarkdown } from '../lib/markdown.js';

const props = defineProps({ source: { type: String, default: '' } });
const html = computed(() => renderMarkdown(props.source));
</script>

<template>
  <div class="markdown-body" v-html="html" />
</template>
