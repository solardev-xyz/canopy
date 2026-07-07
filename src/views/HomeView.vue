<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { normalizeRid } from "../lib/rad-api.js";
import { useRecentsStore } from "../stores/recents.js";

const router = useRouter();
const recents = useRecentsStore();
const input = ref("");
const invalid = ref(false);

const PINNED = [
  {
    rid: "rad:z3gqcJUoA1n9HaHKufZs5FCSGazv5",
    name: "heartwood",
    description: "Radicle Heartwood Protocol & Stack",
  },
  {
    rid: "rad:z4V1sjrXqjvFdnCUbxPFqd5p4DtH5",
    name: "radicle-explorer",
    description: "Web frontend for Radicle",
  },
];

function open(rid) {
  router.push({ name: "code", params: { rid } });
}

function go() {
  const rid = normalizeRid(input.value);
  if (!rid) {
    invalid.value = true;
    return;
  }
  invalid.value = false;
  open(rid);
}
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 py-16">
    <div class="text-center mb-10">
      <div class="text-5xl mb-4">🌳</div>
      <h1 class="text-3xl font-semibold mb-2">Canopy</h1>
      <p class="text-fg-muted max-w-md mx-auto">
        Browse code, issues and patches on the Radicle peer-to-peer network —
        everything served by
        <span class="font-semibold text-fg-default">your own node</span>.
      </p>
    </div>

    <div class="flex gap-2 max-w-xl mx-auto mb-2">
      <input
        v-model="input"
        @keydown.enter="go"
        type="text"
        placeholder="rad:z3gqcJUoA1n9HaHKufZs5FCSGazv5"
        :class="[
          'flex-1 px-4 py-2 rounded-md border bg-canvas font-mono text-sm',
          'focus:outline-none focus:ring-2 focus:ring-accent-emphasis/40',
          invalid ? 'border-danger' : 'border-border-default',
        ]"
      />
      <button
        @click="go"
        class="px-4 py-2 rounded-md text-sm font-medium text-[var(--cnp-btn-primary-fg)] bg-[var(--cnp-btn-primary-bg)] hover:opacity-90 cursor-pointer"
      >
        Open
      </button>
    </div>
    <p v-if="invalid" class="text-center text-danger text-sm mb-4">
      That doesn't look like a Radicle ID (rad:z…)
    </p>

    <div v-if="recents.recents.length" class="mt-10">
      <h2
        class="text-sm font-semibold text-fg-muted uppercase tracking-wide mb-3"
      >
        Recent
      </h2>
      <div class="grid sm:grid-cols-2 gap-3">
        <button
          v-for="r in recents.recents"
          :key="r.rid"
          @click="open(r.rid)"
          class="text-left border border-border-default rounded-md p-4 hover:border-fg-muted cursor-pointer"
        >
          <div class="font-semibold text-accent mb-1">
            {{ r.name ?? r.rid }}
          </div>
          <div class="text-sm text-fg-muted line-clamp-2">
            {{ r.description }}
          </div>
          <div class="text-xs text-fg-muted font-mono mt-2 truncate">
            {{ r.rid }}
          </div>
        </button>
      </div>
    </div>

    <div class="mt-10">
      <h2
        class="text-sm font-semibold text-fg-muted uppercase tracking-wide mb-3"
      >
        From the network
      </h2>
      <div class="grid sm:grid-cols-2 gap-3">
        <button
          v-for="r in PINNED"
          :key="r.rid"
          @click="open(r.rid)"
          class="text-left border border-border-default rounded-md p-4 hover:border-fg-muted cursor-pointer"
        >
          <div class="font-semibold text-accent mb-1">{{ r.name }}</div>
          <div class="text-sm text-fg-muted line-clamp-2">
            {{ r.description }}
          </div>
          <div class="text-xs text-fg-muted font-mono mt-2 truncate">
            {{ r.rid }}
          </div>
        </button>
      </div>
    </div>
  </div>
</template>
