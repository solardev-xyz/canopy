<script setup>
import { computed, watch } from "vue";
import { useRoute } from "vue-router";
import { useRepo } from "../lib/queries.js";
import { useRecentsStore } from "../stores/recents.js";
import { shortDid } from "../lib/rad-api.js";
import LoadingBar from "../components/LoadingBar.vue";
import ErrorBox from "../components/ErrorBox.vue";
import SeedButton from "../components/SeedButton.vue";
import { useRadicleStore } from "../stores/radicle.js";

const props = defineProps({ rid: { type: String, required: true } });
const route = useRoute();
const rid = computed(() => props.rid);

const { data: repo, isPending, error, refetch } = useRepo(rid);
const radicle = useRadicleStore();

async function seedAndReload() {
  if (await radicle.seed(rid.value)) refetch();
}

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
      <ErrorBox
        v-else-if="error"
        title="Repository not available on your node"
        :error="error"
      >
        <p class="text-sm text-fg-muted mt-2">
          Your node only serves repositories it seeds.
        </p>
        <div v-if="radicle.available" class="mt-4">
          <button
            v-if="radicle.connected"
            @click="seedAndReload"
            :disabled="radicle.busy"
            class="px-4 py-2 text-sm rounded-md font-medium text-white bg-[var(--cnp-btn-primary-bg)] hover:opacity-90 cursor-pointer disabled:opacity-50"
          >
            {{
              radicle.busy
                ? "Fetching from the network…"
                : "🌱 Seed this repository"
            }}
          </button>
          <button
            v-else
            @click="radicle.connect()"
            class="px-4 py-2 text-sm rounded-md border border-border-default hover:bg-canvas-subtle cursor-pointer"
          >
            Connect your node to seed it
          </button>
        </div>
      </ErrorBox>
      <RouterView v-else-if="repo" :repo="repo" />
    </div>
  </div>
</template>
