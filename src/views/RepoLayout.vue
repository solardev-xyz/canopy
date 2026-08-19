<script setup>
import { computed, watch } from "vue";
import { useRoute } from "vue-router";
import { useRepo, useRepoStats } from "../lib/queries.js";
import { useRecentsStore } from "../stores/recents.js";
import { shortDid } from "../lib/rad-api.js";
import LoadingBar from "../components/LoadingBar.vue";
import SeedButton from "../components/SeedButton.vue";
import SeedFlow from "../components/SeedFlow.vue";

const props = defineProps({ rid: { type: String, required: true } });
const route = useRoute();
const rid = computed(() => props.rid);

const { data: repo, isPending, error } = useRepo(rid);
const head = computed(() => repo.value?.head ?? null);
const { data: repoStats } = useRepoStats(rid, head);

const recents = useRecentsStore();
watch(repo, (r) => {
  if (r)
    recents.remember({ rid: r.rid, name: r.name, description: r.description });
});

const tabs = computed(() => [
  { name: "code", label: "Code", icon: "‹›", active: ["code", "tree", "blob"] },
  { name: "issues", label: "Issues", icon: "⊙", active: ["issues", "issue"] },
  {
    name: "patches",
    label: "Patches",
    icon: "⎇",
    active: ["patches", "patch"],
  },
  {
    name: "commits",
    label: "Commits",
    icon: "⏱",
    active: ["commits", "commit"],
  },
]);

const activeTab = computed(
  () => tabs.value.find((t) => t.active.includes(route.name))?.name ?? "code",
);
const countLabel = (count, singular) =>
  `${count} ${singular}${count === 1 ? "" : "s"}`;

async function copyRid() {
  try {
    await navigator.clipboard.writeText(rid.value);
  } catch {
    // clipboard unavailable — ignore
  }
}
</script>

<template>
  <div>
    <div class="border-b border-border-default bg-canvas-subtle">
      <div class="max-w-6xl mx-auto px-4 pt-4">
        <div class="flex items-center gap-2 flex-wrap mb-1">
          <span class="text-fg-muted">📦</span>
          <h1 class="text-xl">
            <RouterLink
              :to="{ name: 'code', params: { rid } }"
              class="text-accent font-semibold hover:underline"
            >
              {{ repo?.name ?? "…" }}
            </RouterLink>
          </h1>
          <span
            class="text-xs px-2 py-0.5 rounded-full border border-border-default text-fg-muted"
          >
            {{ repo?.visibility ?? "public" }}
          </span>
          <button
            @click="copyRid"
            class="text-xs font-mono text-fg-muted hover:text-accent cursor-pointer truncate max-w-64"
            :title="`${rid} — click to copy`"
          >
            {{ rid }} ⧉
          </button>
          <span class="ml-auto">
            <SeedButton :rid="rid" />
          </span>
        </div>
        <p v-if="repo?.description" class="text-fg-muted text-sm mb-3">
          {{ repo.description }}
        </p>
        <p v-if="repoStats" class="text-fg-muted text-xs mb-3 flex gap-3">
          <span>{{ countLabel(repoStats.commits, "commit") }}</span>
          <span>{{ countLabel(repoStats.branches, "branch") }}</span>
          <span>{{ countLabel(repoStats.contributors, "contributor") }}</span>
        </p>

        <nav class="flex gap-1 -mb-px">
          <RouterLink
            v-for="tab in tabs"
            :key="tab.name"
            :to="{ name: tab.name, params: { rid } }"
            :class="[
              'flex items-center gap-1.5 px-3 py-2 text-sm rounded-t-md border-b-2',
              activeTab === tab.name
                ? 'border-[#fd8c73] font-semibold'
                : 'border-transparent text-fg-muted hover:bg-neutral-muted',
            ]"
          >
            <span aria-hidden="true" class="text-fg-muted">{{ tab.icon }}</span>
            {{ tab.label }}
          </RouterLink>
        </nav>
      </div>
    </div>

    <div class="max-w-6xl mx-auto px-4 py-4">
      <LoadingBar v-if="isPending" variant="detail" />
      <SeedFlow v-else-if="error" :rid="rid" :error="error" />
      <RouterView v-else-if="repo" :repo="repo" />
    </div>
  </div>
</template>
