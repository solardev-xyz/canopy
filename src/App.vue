<script setup>
import ConnectButton from "./components/ConnectButton.vue";
import TopSearch from "./components/TopSearch.vue";
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <header
      class="flex items-center gap-4 px-4 py-3 bg-canvas-inset border-b border-border-default"
    >
      <RouterLink
        to="/"
        class="flex items-center gap-2 font-semibold text-[15px] shrink-0"
      >
        <span class="text-xl leading-none">🌳</span>
        <span>Canopy</span>
      </RouterLink>
      <div class="flex-1 max-w-md">
        <TopSearch />
      </div>
      <span class="text-xs text-fg-muted hidden sm:block mr-auto">
        a forge on the Radicle network — served by your own node
      </span>
      <ConnectButton />
    </header>
    <main class="flex-1">
      <RouterView />
    </main>
  </div>
</template>
