<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  file: { type: Object, required: true }, // { status, path, oldPath?, diff: { type, hunks } }
});

const open = ref(true);

const path = computed(() =>
  props.file.status === 'moved' || props.file.status === 'copied'
    ? `${props.file.oldPath} → ${props.file.newPath}`
    : (props.file.path ?? props.file.newPath ?? props.file.oldPath)
);

const stats = computed(() => {
  let add = 0;
  let del = 0;
  for (const hunk of props.file.diff?.hunks ?? []) {
    for (const line of hunk.lines) {
      if (line.type === 'addition') add++;
      else if (line.type === 'deletion') del++;
    }
  }
  return { add, del };
});

function lineClass(type) {
  if (type === 'addition') return 'bg-[var(--cnp-diff-add-bg)]';
  if (type === 'deletion') return 'bg-[var(--cnp-diff-del-bg)]';
  return '';
}
function gutterClass(type) {
  if (type === 'addition') return 'bg-[var(--cnp-diff-add-line)]';
  if (type === 'deletion') return 'bg-[var(--cnp-diff-del-line)]';
  return 'bg-canvas-subtle';
}
function marker(type) {
  if (type === 'addition') return '+';
  if (type === 'deletion') return '-';
  return ' ';
}
</script>

<template>
  <div class="border border-border-default rounded-md overflow-hidden">
    <button
      class="w-full flex items-center gap-2 px-3 py-2 bg-canvas-subtle text-sm font-mono cursor-pointer text-left"
      @click="open = !open"
    >
      <span class="text-fg-muted w-3 inline-block">{{ open ? '▾' : '▸' }}</span>
      <span class="font-semibold break-all">{{ path }}</span>
      <span
        v-if="file.status && file.status !== 'modified'"
        class="text-xs px-1.5 py-0.5 rounded border border-border-default text-fg-muted"
      >
        {{ file.status }}
      </span>
      <span class="ml-auto text-xs whitespace-nowrap">
        <span class="text-success font-semibold">+{{ stats.add }}</span>
        <span class="text-danger font-semibold ml-1">−{{ stats.del }}</span>
      </span>
    </button>
    <div v-if="open && file.diff?.hunks?.length" class="overflow-x-auto">
      <table class="w-full border-collapse font-mono text-xs leading-5">
        <tbody>
          <template v-for="(hunk, hi) in file.diff.hunks" :key="hi">
            <tr class="bg-accent-emphasis/10 text-fg-muted">
              <td class="w-[1%] px-2 select-none" colspan="2"></td>
              <td class="px-2 py-1 whitespace-pre">{{ hunk.header.trim() }}</td>
            </tr>
            <tr v-for="(line, li) in hunk.lines" :key="li" :class="lineClass(line.type)">
              <td
                :class="[
                  'w-[1%] min-w-10 px-2 text-right text-fg-muted select-none',
                  gutterClass(line.type),
                ]"
              >
                {{ line.lineNoOld ?? '' }}
              </td>
              <td
                :class="[
                  'w-[1%] min-w-10 px-2 text-right text-fg-muted select-none border-r border-border-muted',
                  gutterClass(line.type),
                ]"
              >
                {{ line.lineNoNew ?? '' }}
              </td>
              <td class="px-2 whitespace-pre-wrap break-all">
                <span class="select-none inline-block w-3">{{ marker(line.type) }}</span
                >{{ line.line.replace(/\n$/, '') }}
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
    <div v-else-if="open" class="px-4 py-3 text-sm text-fg-muted">
      {{ file.diff?.type === 'binary' ? 'Binary file' : 'No textual changes' }}
    </div>
  </div>
</template>
