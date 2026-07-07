<script setup>
import { computed } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { useRecentsStore } from "../stores/recents.js";
import { useRadicleStore } from "../stores/radicle.js";
import { buildProfile, dedupeRepos } from "../lib/profile.js";
import { shortDid, formatTimestamp } from "../lib/rad-api.js";
import { hueFromId } from "../lib/identicon.js";
import { radicleRequest } from "../lib/provider.js";
import { useNetworkIndex } from "../lib/index-queries.js";
import LoadingBar from "../components/LoadingBar.vue";
import StateBadge from "../components/StateBadge.vue";

const props = defineProps({ did: { type: String, required: true } });

const recents = useRecentsStore();
const radicle = useRadicleStore();

const PINNED = [
  { rid: "rad:z3gqcJUoA1n9HaHKufZs5FCSGazv5" },
  { rid: "rad:z4V1sjrXqjvFdnCUbxPFqd5p4DtH5" },
];

const { data: index } = useNetworkIndex();
const indexUser = computed(
  () => index.value?.users?.find((u) => u.did === props.did) ?? null,
);
const indexRepoName = (rid) =>
  index.value?.repos?.find((r) => r.rid === rid)?.name ?? rid;

const { data: profile, isPending } = useQuery({
  queryKey: computed(() => ["profile", props.did, radicle.connected]),
  queryFn: async () => {
    // Candidate repos: the node's seeded set (when connected) plus repos
    // this client has visited. Radicle has no global index — this page is
    // the DID as seen from here.
    let seeded = [];
    if (radicle.available && radicle.connected) {
      seeded = await radicleRequest("radicle_listSeededRepos").catch(() => []);
    }
    const candidates = dedupeRepos(seeded, recents.recents, PINNED);
    return buildProfile(props.did, candidates);
  },
  staleTime: 60_000,
});

const displayName = computed(
  () => profile.value?.alias ?? indexUser.value?.alias ?? shortDid(props.did),
);
const nid = computed(() => props.did.replace(/^did:key:/, ""));

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // clipboard unavailable
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 py-8">
    <!-- identity card -->
    <div
      class="flex items-center gap-5 pb-6 border-b border-border-default mb-6"
    >
      <span
        class="w-20 h-20 rounded-full inline-block shrink-0 border border-border-muted"
        :style="{
          background: `radial-gradient(circle at 30% 30%, hsl(${hueFromId(did)} 70% 65%), hsl(${(hueFromId(did) + 40) % 360} 65% 45%))`,
        }"
        aria-hidden="true"
      />
      <div class="min-w-0">
        <h1 class="text-2xl font-semibold">{{ displayName }}</h1>
        <button
          @click="copy(did)"
          class="text-sm text-fg-muted font-mono hover:text-accent cursor-pointer truncate max-w-full block"
          :title="`${did} — click to copy`"
        >
          {{ nid }} ⧉
        </button>
        <p class="text-xs text-fg-muted mt-1">
          Radicle identity — activity as seen by your node
          <template v-if="profile">
            ({{ profile.scannedRepos }} known repositories)</template
          >
        </p>
      </div>
    </div>

    <!-- network-wide view from the configured index feeds -->
    <section v-if="indexUser" class="mb-8">
      <h2
        class="text-sm font-semibold text-fg-muted uppercase tracking-wide mb-3"
      >
        Across the network
        <span class="normal-case font-normal">(from your index feeds)</span>
      </h2>
      <div
        class="border border-border-default rounded-md p-4 text-sm flex gap-6 flex-wrap"
      >
        <span
          >📦 maintains
          <span class="font-semibold">{{ indexUser.maintains.length }}</span>
          repos</span
        >
        <span
          >⊙
          <span class="font-semibold">{{ indexUser.issues }}</span> issues</span
        >
        <span
          >⎇
          <span class="font-semibold">{{ indexUser.patches }}</span>
          patches</span
        >
      </div>
      <div v-if="indexUser.maintains.length" class="flex gap-2 flex-wrap mt-2">
        <RouterLink
          v-for="rid in indexUser.maintains"
          :key="rid"
          :to="{ name: 'code', params: { rid } }"
          class="text-xs px-2 py-1 rounded-full border border-border-default hover:border-fg-muted text-accent"
        >
          {{ indexRepoName(rid) }}
        </RouterLink>
      </div>
    </section>

    <LoadingBar v-if="isPending" variant="cards" :count="4" />
    <template v-else-if="profile">
      <!-- maintainer of -->
      <section v-if="profile.maintains.length" class="mb-8">
        <h2
          class="text-sm font-semibold text-fg-muted uppercase tracking-wide mb-3"
        >
          Maintainer of
        </h2>
        <div class="grid sm:grid-cols-2 gap-3">
          <RouterLink
            v-for="repo in profile.maintains"
            :key="repo.rid"
            :to="{ name: 'code', params: { rid: repo.rid } }"
            class="border border-border-default rounded-md p-4 hover:border-fg-muted"
          >
            <div class="font-semibold text-accent mb-1">📦 {{ repo.name }}</div>
            <div class="text-sm text-fg-muted line-clamp-2">
              {{ repo.description }}
            </div>
            <div v-if="repo.seeding != null" class="text-xs text-fg-muted mt-2">
              🌱 {{ repo.seeding }} node{{ repo.seeding === 1 ? "" : "s" }}
              seeding
            </div>
          </RouterLink>
        </div>
      </section>

      <!-- authored issues -->
      <section v-if="profile.issues.length" class="mb-8">
        <h2
          class="text-sm font-semibold text-fg-muted uppercase tracking-wide mb-3"
        >
          Issues ({{ profile.issues.length }})
        </h2>
        <div class="border border-border-default rounded-md overflow-hidden">
          <div
            v-for="issue in profile.issues"
            :key="issue.id"
            class="px-4 py-2.5 border-b border-border-muted last:border-0 hover:bg-canvas-subtle flex gap-3 items-center"
          >
            <span
              :class="
                issue.state.status === 'open' ? 'text-success' : 'text-done'
              "
              aria-hidden="true"
            >
              {{ issue.state.status === "open" ? "⊙" : "⊘" }}
            </span>
            <div class="min-w-0 flex-1">
              <RouterLink
                :to="{
                  name: 'issue',
                  params: { rid: issue.repo.rid, id: issue.id },
                }"
                class="font-semibold hover:text-accent block truncate"
              >
                {{ issue.title }}
              </RouterLink>
              <div class="text-xs text-fg-muted">
                {{ issue.repo.name }} ·
                {{ formatTimestamp(issue.discussion?.[0]?.timestamp) }}
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- authored patches -->
      <section v-if="profile.patches.length" class="mb-8">
        <h2
          class="text-sm font-semibold text-fg-muted uppercase tracking-wide mb-3"
        >
          Patches ({{ profile.patches.length }})
        </h2>
        <div class="border border-border-default rounded-md overflow-hidden">
          <div
            v-for="patch in profile.patches"
            :key="patch.id"
            class="px-4 py-2.5 border-b border-border-muted last:border-0 hover:bg-canvas-subtle flex gap-3 items-center"
          >
            <StateBadge kind="patch" :state="patch.state" />
            <div class="min-w-0 flex-1">
              <RouterLink
                :to="{
                  name: 'patch',
                  params: { rid: patch.repo.rid, id: patch.id },
                }"
                class="font-semibold hover:text-accent block truncate"
              >
                {{ patch.title }}
              </RouterLink>
              <div class="text-xs text-fg-muted">{{ patch.repo.name }}</div>
            </div>
          </div>
        </div>
      </section>

      <div
        v-if="
          !profile.maintains.length &&
          !profile.issues.length &&
          !profile.patches.length
        "
        class="py-16 text-center text-fg-muted"
      >
        No activity for this identity in the repositories your node knows about.
        <p class="text-xs mt-2">
          Seed more repositories to widen your view of the network.
        </p>
      </div>
    </template>
  </div>
</template>
