<script setup>
import { computed, ref } from "vue";
import { usePatches } from "../lib/queries.js";
import { formatTimestamp, shortDid } from "../lib/rad-api.js";
import LoadingBar from "../components/LoadingBar.vue";
import ErrorBox from "../components/ErrorBox.vue";

const props = defineProps({ repo: { type: Object, required: true } });
const rid = computed(() => props.repo.rid);
const state = ref("open");
const STATES = ["open", "draft", "merged", "archived"];

const { data: patches, isPending, error } = usePatches(rid, state);

const stateColor = {
  open: "text-success",
  draft: "text-fg-muted",
  merged: "text-done",
  archived: "text-danger",
};
</script>

<template>
  <div>
    <div class="flex gap-4 mb-3 text-sm">
      <button
        v-for="s in STATES"
        :key="s"
        @click="state = s"
        :class="[
          'cursor-pointer capitalize',
          state === s ? 'font-semibold' : 'text-fg-muted hover:text-fg-default',
        ]"
      >
        {{ s }}
      </button>
    </div>

    <LoadingBar v-if="isPending" variant="list" :count="8" />
    <ErrorBox v-else-if="error" title="Could not load patches" :error="error" />
    <div
      v-else-if="patches?.length === 0"
      class="py-16 text-center text-fg-muted"
    >
      No {{ state }} patches.
    </div>
    <div
      v-else-if="patches"
      class="border border-border-default rounded-md overflow-hidden"
    >
      <div
        v-for="patch in patches"
        :key="patch.id"
        class="px-4 py-2.5 border-b border-border-muted last:border-0 hover:bg-canvas-subtle flex gap-3"
      >
        <span
          :class="['mt-0.5', stateColor[patch.state.status]]"
          aria-hidden="true"
          >⎇</span
        >
        <div class="min-w-0 flex-1">
          <RouterLink
            :to="{ name: 'patch', params: { rid, id: patch.id } }"
            class="font-semibold hover:text-accent block"
          >
            {{ patch.title }}
            <span
              v-for="label in patch.labels"
              :key="label"
              class="ml-1 text-xs font-normal px-2 py-0.5 rounded-full border border-border-default text-fg-muted"
            >
              {{ label }}
            </span>
          </RouterLink>
          <div class="text-xs text-fg-muted mt-0.5">
            {{ patch.revisions.length }} revision{{
              patch.revisions.length === 1 ? "" : "s"
            }}
            · opened {{ formatTimestamp(patch.revisions?.[0]?.timestamp) }} by
            <RouterLink
              :to="{ name: 'user', params: { did: patch.author.id } }"
              class="hover:text-accent hover:underline"
            >
              {{ patch.author.alias ?? shortDid(patch.author.id) }}
            </RouterLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
