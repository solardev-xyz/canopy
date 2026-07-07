<script setup>
import { computed, ref } from "vue";
import { useRadicleStore } from "../stores/radicle.js";

const props = defineProps({ rid: { type: String, required: true } });
const radicle = useRadicleStore();
const error = ref(null);

const fetching = computed(
  () => radicle.seedProgress[props.rid]?.state === "fetching",
);

const label = computed(() => {
  if (fetching.value) return "Fetching…";
  if (radicle.busy) return "Working…";
  return radicle.isSeeded(props.rid) ? "Seeding" : "Seed";
});

// The store tracks the fetch and refreshes this repo's queries when it
// lands — nothing to invalidate here.
async function toggle() {
  error.value = null;
  try {
    if (radicle.isSeeded(props.rid)) {
      await radicle.unseed(props.rid);
    } else {
      await radicle.seed(props.rid);
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
      :disabled="radicle.busy || fetching"
      :class="[
        'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border font-medium cursor-pointer disabled:opacity-50',
        radicle.isSeeded(rid)
          ? 'border-border-default bg-canvas-subtle hover:border-danger'
          : 'border-transparent text-white bg-[var(--cnp-btn-primary-bg)] hover:opacity-90',
      ]"
      :title="
        fetching
          ? 'Downloading the repository from the network'
          : radicle.isSeeded(rid)
            ? 'Your node seeds this repository'
            : 'Seed with your node'
      "
    >
      <span aria-hidden="true">🌱</span>
      {{ label }}
    </button>
    <span v-if="error" class="text-danger text-xs">{{ error }}</span>
  </div>
</template>
