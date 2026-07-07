<script setup>
/**
 * Filter + pager controls for a usePagedList — one consistent row used
 * above every long list (directory, profile sections, seeded repos).
 * Takes the composable's return object whole; hides itself when a pager
 * isn't warranted (unless `always`, for filters that double as search).
 */
defineProps({
  list: { type: Object, required: true }, // usePagedList return
  placeholder: { type: String, default: "Filter…" },
  noun: { type: String, default: "items" },
  always: { type: Boolean, default: false },
});
</script>

<template>
  <div v-if="always || list.needed.value" class="flex items-center gap-2 mb-3">
    <input
      v-model="list.query.value"
      type="text"
      :placeholder="placeholder"
      class="flex-1 min-w-0 px-3 py-1.5 text-sm rounded-md border border-border-default bg-canvas placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-accent-emphasis/40"
    />
    <span class="text-xs text-fg-muted whitespace-nowrap">
      {{ list.total.value }} {{ noun }}
    </span>
    <div v-if="list.totalPages.value > 1" class="flex items-center gap-1">
      <button
        @click="list.prev()"
        :disabled="list.page.value === 0"
        class="px-2 py-1 text-sm rounded-md border border-border-default hover:bg-canvas-subtle cursor-pointer disabled:opacity-40 disabled:cursor-default"
        aria-label="Previous page"
      >
        ←
      </button>
      <span class="text-xs text-fg-muted whitespace-nowrap tabular-nums">
        {{ list.page.value + 1 }}/{{ list.totalPages.value }}
      </span>
      <button
        @click="list.next()"
        :disabled="list.page.value >= list.totalPages.value - 1"
        class="px-2 py-1 text-sm rounded-md border border-border-default hover:bg-canvas-subtle cursor-pointer disabled:opacity-40 disabled:cursor-default"
        aria-label="Next page"
      >
        →
      </button>
    </div>
  </div>
</template>
