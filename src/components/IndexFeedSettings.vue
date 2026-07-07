<script setup>
import { ref } from "vue";
import { useQueryClient } from "@tanstack/vue-query";
import {
  getIndexFeeds,
  setIndexFeeds,
  isSwarmRef,
  DEFAULT_INDEX_FEED,
} from "../lib/index-api.js";

const emit = defineEmits(["close"]);
const queryClient = useQueryClient();

const feeds = ref(getIndexFeeds());
const input = ref("");
const error = ref(null);

function add() {
  const ref64 = input.value.trim().replace(/^bzz:\/\//, "");
  if (!isSwarmRef(ref64)) {
    error.value = "An index feed is a 64-hex Swarm reference";
    return;
  }
  error.value = null;
  if (!feeds.value.includes(ref64)) feeds.value = [...feeds.value, ref64];
  input.value = "";
}

function remove(feed) {
  feeds.value = feeds.value.filter((f) => f !== feed);
}

function reset() {
  feeds.value = [DEFAULT_INDEX_FEED];
}

function save() {
  setIndexFeeds(feeds.value.length ? feeds.value : [DEFAULT_INDEX_FEED]);
  queryClient.invalidateQueries({ queryKey: ["network-index"] });
  emit("close");
}
</script>

<template>
  <div class="border border-border-default rounded-md p-4 mb-6">
    <h2 class="font-semibold mb-1">Index feeds</h2>
    <p class="text-xs text-fg-muted mb-3">
      Anyone can publish a network index to Swarm — you choose whose view you
      trust. The index only affects discovery; everything you open is verified
      by your own node.
    </p>

    <div
      v-for="feed in feeds"
      :key="feed"
      class="flex items-center gap-2 text-xs font-mono mb-1"
    >
      <span class="truncate flex-1">
        bzz://{{ feed }}
        <span v-if="feed === DEFAULT_INDEX_FEED" class="text-fg-muted font-sans"
          >(default)</span
        >
      </span>
      <button
        @click="remove(feed)"
        class="text-fg-muted hover:text-danger cursor-pointer"
        title="Remove"
      >
        ✕
      </button>
    </div>

    <div class="flex gap-2 mt-3">
      <input
        v-model="input"
        @keydown.enter="add"
        type="text"
        placeholder="bzz://… feed reference"
        class="flex-1 px-3 py-1.5 text-xs font-mono rounded-md border border-border-default bg-canvas focus:outline-none"
      />
      <button
        @click="add"
        class="px-3 py-1.5 text-sm rounded-md border border-border-default hover:bg-canvas-subtle cursor-pointer"
      >
        Add
      </button>
    </div>
    <p v-if="error" class="text-danger text-xs mt-1">{{ error }}</p>

    <div class="flex justify-end gap-2 mt-4">
      <button
        @click="reset"
        class="px-3 py-1.5 text-sm rounded-md border border-border-default hover:bg-canvas-subtle cursor-pointer"
      >
        Reset to default
      </button>
      <button
        @click="save"
        class="px-4 py-1.5 text-sm rounded-md font-medium text-white bg-[var(--cnp-btn-primary-bg)] hover:opacity-90 cursor-pointer"
      >
        Save
      </button>
    </div>
  </div>
</template>
