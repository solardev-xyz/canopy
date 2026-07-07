<script setup>
import { onMounted } from "vue";
import { useRadicleStore } from "../stores/radicle.js";
import AccountMenu from "./AccountMenu.vue";

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
    <AccountMenu v-else />
  </div>
</template>
