<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useBlob } from "../lib/queries.js";
import { highlightFile, renderMarkdown } from "../lib/markdown.js";
import LoadingBar from "../components/LoadingBar.vue";
import ErrorBox from "../components/ErrorBox.vue";

const props = defineProps({ repo: { type: Object, required: true } });
const route = useRoute();

const rid = computed(() => props.repo.rid);
const path = computed(() => route.params.path);
const {
  data: blob,
  isPending,
  error,
} = useBlob(
  rid,
  computed(() => props.repo.head),
  path,
);

const crumbs = computed(() => {
  const parts = (path.value ?? "").split("/");
  return parts.map((name, i) => ({
    name,
    path: parts.slice(0, i + 1).join("/"),
  }));
});

const isMarkdown = computed(() => /\.(md|markdown)$/i.test(path.value ?? ""));
const lines = computed(() => {
  if (!blob.value || blob.value.binary || isMarkdown.value) return [];
  return highlightFile(blob.value.content ?? "", path.value).split("\n");
});
const markdownHtml = computed(() =>
  isMarkdown.value && blob.value ? renderMarkdown(blob.value.content) : "",
);
</script>

<template>
  <div>
    <nav class="text-sm flex items-center gap-1 flex-wrap mb-3">
      <RouterLink
        :to="{ name: 'code', params: { rid } }"
        class="text-accent hover:underline"
      >
        {{ repo.name }}
      </RouterLink>
      <template v-for="(c, i) in crumbs" :key="c.path">
        <span class="text-fg-muted">/</span>
        <RouterLink
          v-if="i < crumbs.length - 1"
          :to="{ name: 'tree', params: { rid, path: c.path } }"
          class="text-accent hover:underline"
        >
          {{ c.name }}
        </RouterLink>
        <span v-else class="font-semibold">{{ c.name }}</span>
      </template>
    </nav>

    <LoadingBar v-if="isPending" variant="detail" />
    <ErrorBox v-else-if="error" title="Could not load file" :error="error" />
    <div
      v-else-if="blob"
      class="border border-border-default rounded-md overflow-hidden"
    >
      <div
        class="px-4 py-2 text-xs text-fg-muted bg-canvas-subtle border-b border-border-default flex gap-3"
      >
        <span class="font-semibold text-fg-default">{{ blob.name }}</span>
        <span v-if="!blob.binary"
          >{{ (blob.content ?? "").split("\n").length }} lines</span
        >
        <span v-if="blob.binary">binary file</span>
      </div>
      <div v-if="blob.binary" class="p-8 text-center text-fg-muted text-sm">
        Binary file — not shown.
      </div>
      <div v-else-if="isMarkdown" class="p-6">
        <div class="markdown-body" v-html="markdownHtml" />
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full font-mono text-xs leading-5">
          <tbody>
            <tr v-for="(line, i) in lines" :key="i">
              <td
                class="w-[1%] min-w-12 px-2 text-right text-fg-muted select-none align-top bg-canvas"
              >
                {{ i + 1 }}
              </td>
              <!-- eslint-disable-next-line vue/no-v-html -- hljs output of escaped content -->
              <td class="px-2 whitespace-pre" v-html="line || '&nbsp;'"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
