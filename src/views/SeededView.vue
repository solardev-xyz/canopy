<script setup>
import { computed } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { useRadicleStore } from "../stores/radicle.js";
import { radicleRequest } from "../lib/provider.js";
import { matchRepo } from "../lib/index-api.js";
import { usePagedList } from "../lib/paging.js";
import ConnectButton from "../components/ConnectButton.vue";
import LoadingBar from "../components/LoadingBar.vue";
import PagerBar from "../components/PagerBar.vue";
import SeedButton from "../components/SeedButton.vue";

/**
 * The repositories the user's node seeds — the "your account's repos"
 * view behind the account menu. Entries include policies still waiting for
 * their first successful fetch, and the Seed button manages both cases.
 */
const radicle = useRadicleStore();

const { data: repos, isPending } = useQuery({
  queryKey: computed(() => ["seeded-repos", radicle.connected]),
  queryFn: () => radicleRequest("radicle_listSeededRepos"),
  enabled: computed(() => radicle.available && radicle.connected),
  staleTime: 30_000,
});

// The store invalidates the "seeded-repos" key on seed/unseed, so this
// query is the single owner of the list.
const list = usePagedList(
  computed(() => repos.value ?? []),
  { pageSize: 20, match: matchRepo },
);
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 py-8">
    <h1 class="text-2xl font-semibold mb-1">Your repositories</h1>
    <p class="text-sm text-fg-muted mb-6">
      Repositories your node is configured to seed. They are served to the
      network after the first successful fetch.
    </p>

    <div
      v-if="!radicle.available || !radicle.connected"
      class="border border-border-default rounded-md p-6 text-center text-sm text-fg-muted"
    >
      Connect your node to see the repositories it seeds.
      <div class="mt-3 flex justify-center">
        <ConnectButton />
      </div>
    </div>

    <LoadingBar v-else-if="isPending" variant="list" :count="6" />

    <template v-else>
      <PagerBar
        :list="list"
        placeholder="Filter repositories…"
        noun="repositories"
      />

      <div
        v-if="list.items.value.length"
        class="border border-border-default rounded-md overflow-hidden"
      >
        <div
          v-for="repo in list.items.value"
          :key="repo.rid"
          class="px-4 py-3 border-b border-border-muted last:border-0 flex items-center gap-3"
        >
          <div class="min-w-0 flex-1">
            <RouterLink
              :to="{ name: 'code', params: { rid: repo.rid } }"
              class="font-semibold text-accent hover:underline block truncate"
            >
              📦 {{ repo.name || repo.rid }}
            </RouterLink>
            <div class="text-sm text-fg-muted truncate">
              {{
                repo.description ||
                (repo.name ? repo.rid : "Awaiting first successful fetch")
              }}
            </div>
          </div>
          <SeedButton :rid="repo.rid" />
        </div>
      </div>

      <p v-else class="text-center text-fg-muted py-16">
        <template v-if="list.query.value">
          No seeded repositories match "{{ list.query.value }}".
        </template>
        <template v-else>
          Your node doesn't seed any repositories yet — open one from the
          directory and hit 🌱 Seed.
        </template>
      </p>
    </template>
  </div>
</template>
