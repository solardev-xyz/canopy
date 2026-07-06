<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { normalizeRid } from './lib/rad-api.js';

const router = useRouter();
const search = ref('');
const invalid = ref(false);

function go() {
  const rid = normalizeRid(search.value);
  if (!rid) {
    invalid.value = true;
    setTimeout(() => (invalid.value = false), 1200);
    return;
  }
  search.value = '';
  router.push({ name: 'code', params: { rid } });
}
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <header
      class="flex items-center gap-4 px-4 py-3 bg-canvas-inset border-b border-border-default"
    >
      <RouterLink to="/" class="flex items-center gap-2 font-semibold text-[15px] shrink-0">
        <span class="text-xl leading-none">🌳</span>
        <span>Canopy</span>
      </RouterLink>
      <div class="flex-1 max-w-md">
        <input
          v-model="search"
          @keydown.enter="go"
          type="text"
          placeholder="Jump to repository… (rad:z…)"
          :class="[
            'w-full px-3 py-1.5 text-sm rounded-md border bg-canvas placeholder:text-fg-muted',
            'focus:outline-none focus:ring-2 focus:ring-accent-emphasis/40',
            invalid ? 'border-danger' : 'border-border-default',
          ]"
        />
      </div>
      <span class="text-xs text-fg-muted hidden sm:block">
        a forge on the Radicle network — served by your own node
      </span>
    </header>
    <main class="flex-1">
      <RouterView />
    </main>
  </div>
</template>
