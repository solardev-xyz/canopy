<script setup>
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { normalizeRid, formatTimestamp } from "../lib/rad-api.js";
import { searchRepos, searchUsers } from "../lib/index-api.js";
import { shortDid } from "../lib/rad-api.js";
import { hueFromId } from "../lib/identicon.js";
import { useNetworkIndex } from "../lib/index-queries.js";
import { useRecentsStore } from "../stores/recents.js";
import IndexFeedSettings from "../components/IndexFeedSettings.vue";

const router = useRouter();
const recents = useRecentsStore();
const input = ref("");
const invalid = ref(false);
const showFeedSettings = ref(false);

const { data: index, isPending: indexPending } = useNetworkIndex();

const query = ref("");
const results = computed(() => {
  if (!index.value?.available) return [];
  return searchRepos(index.value.repos, query.value).slice(0, 50);
});
const userResults = computed(() => {
  if (!index.value?.available) return [];
  return searchUsers(index.value.users, query.value).slice(0, 12);
});
const totals = computed(() => {
  const manifests = index.value?.manifests ?? [];
  if (!manifests.length) return null;
  return {
    known: Math.max(...manifests.map((m) => m.network.knownRepos)),
    indexed: index.value.repos.length,
    generatedAt: Math.max(...manifests.map((m) => m.generatedAt)),
  };
});

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
  <div class="max-w-4xl mx-auto px-4 py-12">
    <div class="text-center mb-8">
      <div class="text-5xl mb-4">🌳</div>
      <h1 class="text-3xl font-semibold mb-2">Canopy</h1>
      <p class="text-fg-muted max-w-md mx-auto">
        Browse code, issues and patches on the Radicle peer-to-peer network —
        everything served by
        <span class="font-semibold text-fg-default">your own node</span>.
      </p>
    </div>

    <!-- direct RID entry -->
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

    <!-- global network directory (from the configured index feeds) -->
    <div v-if="index?.available" class="mt-10">
      <div class="flex items-center gap-2 mb-3">
        <h2 class="text-sm font-semibold text-fg-muted uppercase tracking-wide">
          The Radicle network
        </h2>
        <span v-if="totals" class="text-xs text-fg-muted">
          · {{ totals.indexed }} indexed of {{ totals.known }} known repos ·
          updated {{ formatTimestamp(totals.generatedAt) }}
        </span>
        <button
          @click="showFeedSettings = !showFeedSettings"
          class="ml-auto text-xs text-fg-muted hover:text-accent cursor-pointer"
          title="Choose index feeds"
        >
          ⚙ index feeds
        </button>
      </div>

      <IndexFeedSettings
        v-if="showFeedSettings"
        @close="showFeedSettings = false"
      />

      <input
        v-model="query"
        type="text"
        placeholder="Search repositories…"
        class="w-full px-4 py-2 mb-4 rounded-md border border-border-default bg-canvas text-sm focus:outline-none focus:ring-2 focus:ring-accent-emphasis/40"
      />

      <!-- people matches -->
      <div v-if="userResults.length" class="mb-4">
        <h3
          class="text-xs font-semibold text-fg-muted uppercase tracking-wide mb-2"
        >
          People
        </h3>
        <div class="flex gap-2 flex-wrap">
          <RouterLink
            v-for="user in userResults"
            :key="user.did"
            :to="{ name: 'user', params: { did: user.did } }"
            class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border-default hover:border-fg-muted text-sm"
          >
            <span
              class="w-4 h-4 rounded-full inline-block border border-border-muted"
              :style="{ background: `hsl(${hueFromId(user.did)} 65% 55%)` }"
            />
            {{ user.alias ?? shortDid(user.did) }}
            <span class="text-xs text-fg-muted">
              {{ user.maintains.length }} repos ·
              {{ user.issues + user.patches }} contributions
            </span>
          </RouterLink>
        </div>
      </div>

      <div class="grid sm:grid-cols-2 gap-3">
        <button
          v-for="repo in results"
          :key="repo.rid"
          @click="open(repo.rid)"
          class="text-left border border-border-default rounded-md p-4 hover:border-fg-muted cursor-pointer"
        >
          <div class="font-semibold text-accent mb-1">📦 {{ repo.name }}</div>
          <div class="text-sm text-fg-muted line-clamp-2 min-h-10">
            {{ repo.description || "No description" }}
          </div>
          <div class="text-xs text-fg-muted mt-2 flex gap-3 flex-wrap">
            <span>🌱 {{ repo.seeders }}</span>
            <span>⊙ {{ repo.issues.open }}</span>
            <span>⎇ {{ repo.patches.open }}</span>
            <span v-if="repo.lastActivity">{{
              formatTimestamp(repo.lastActivity)
            }}</span>
          </div>
        </button>
      </div>
      <p v-if="query && !results.length" class="text-center text-fg-muted py-8">
        No indexed repositories match "{{ query }}".
      </p>
    </div>

    <div
      v-else-if="!indexPending"
      class="mt-10 text-center text-sm text-fg-muted border border-border-default rounded-md p-6"
    >
      No network index reachable — global discovery needs Swarm access (Freedom
      Browser, or a local bee in dev). Direct rad:z… access works regardless.
    </div>

    <!-- locally visited repos -->
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
  </div>
</template>
