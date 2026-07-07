<script setup>
// Skeleton placeholders shown while Swarm/Radicle fetches are in flight —
// first loads over the network can take seconds, so shape matters more
// than a spinner. Variants mirror the layout they stand in for.
defineProps({
  variant: { type: String, default: "list" }, // 'list' | 'cards' | 'detail'
  count: { type: Number, default: 6 },
});
</script>

<template>
  <!-- list: table-ish rows (files, commits, issues, patches) -->
  <div
    v-if="variant === 'list'"
    class="border border-border-default rounded-md overflow-hidden"
    aria-busy="true"
  >
    <div
      v-for="i in count"
      :key="i"
      class="px-4 py-3 border-b border-border-muted last:border-0 flex items-center gap-3"
    >
      <span class="skeleton w-4 h-4 rounded-full shrink-0" />
      <span
        class="skeleton h-4"
        :style="{ width: `${30 + ((i * 17) % 45)}%` }"
      />
      <span class="skeleton h-3 w-16 ml-auto shrink-0" />
    </div>
  </div>

  <!-- cards: directory / profile repo grids -->
  <div
    v-else-if="variant === 'cards'"
    class="grid sm:grid-cols-2 gap-3"
    aria-busy="true"
  >
    <div
      v-for="i in count"
      :key="i"
      class="border border-border-default rounded-md p-4"
    >
      <span
        class="skeleton h-4 block mb-2"
        :style="{ width: `${35 + ((i * 23) % 30)}%` }"
      />
      <span class="skeleton h-3 block mb-1 w-full" />
      <span
        class="skeleton h-3 block mb-3"
        :style="{ width: `${50 + ((i * 13) % 35)}%` }"
      />
      <span class="skeleton h-3 block w-24" />
    </div>
  </div>

  <!-- detail: page header + content blocks (issue, patch, blob, commit) -->
  <div v-else aria-busy="true">
    <span class="skeleton h-7 block mb-3" style="width: 45%" />
    <span class="skeleton h-4 block mb-6" style="width: 30%" />
    <div class="border border-border-default rounded-md p-4">
      <span class="skeleton h-3 block mb-2 w-full" />
      <span class="skeleton h-3 block mb-2" style="width: 85%" />
      <span class="skeleton h-3 block mb-2" style="width: 92%" />
      <span class="skeleton h-3 block" style="width: 60%" />
    </div>
  </div>
</template>
