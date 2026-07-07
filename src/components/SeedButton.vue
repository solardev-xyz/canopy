<script setup>
import { ref } from "vue";
import { useQueryClient } from "@tanstack/vue-query";
import { useRadicleStore } from "../stores/radicle.js";

const props = defineProps({ rid: { type: String, required: true } });
const radicle = useRadicleStore();
const queryClient = useQueryClient();
const error = ref(null);

async function toggle() {
  error.value = null;
  try {
    if (radicle.isSeeded(props.rid)) {
      await radicle.unseed(props.rid);
    } else {
      const seeded = await radicle.seed(props.rid);
      // Seeding fetched the repo — everything is now loadable.
      if (seeded) queryClient.invalidateQueries();
    }
  } catch (err) {
    error.value = err.message;
  }
}
</script>

<template>
  <div
    v-if="radicle.available && radicle.connected"
    class="inline-flex items-center gap-2"
  >
    <button
      @click="toggle"
      :disabled="radicle.busy"
      :class="[
        'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border font-medium cursor-pointer disabled:opacity-50',
        radicle.isSeeded(rid)
          ? 'border-border-default bg-canvas-subtle hover:border-danger'
          : 'border-transparent text-white bg-[var(--cnp-btn-primary-bg)] hover:opacity-90',
      ]"
      :title="
        radicle.isSeeded(rid)
          ? 'Your node seeds this repository'
          : 'Seed with your node'
      "
    >
      <span aria-hidden="true">🌱</span>
      {{
        radicle.busy ? "Working…" : radicle.isSeeded(rid) ? "Seeding" : "Seed"
      }}
    </button>
    <span v-if="error" class="text-danger text-xs">{{ error }}</span>
  </div>
</template>
