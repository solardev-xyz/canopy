<script setup>
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { normalizeRid, shortDid } from "../lib/rad-api.js";
import { searchRepos, searchUsers } from "../lib/index-api.js";
import { useIndexLookups } from "../lib/index-queries.js";
import { identiconGradient } from "../lib/identicon.js";
import { useClickOutside } from "../lib/use-click-outside.js";

/**
 * Unified jump/search for the top bar: a rad:… RID jumps straight to the
 * repository; anything else is a live search over the network index
 * (repos + people), GitHub-style dropdown included.
 */
const router = useRouter();
const { index, reposByRid } = useIndexLookups();

const input = ref("");
const focused = ref(false);
const activeIdx = ref(-1);
const root = ref(null);

const rid = computed(() => normalizeRid(input.value));

const MAX_REPOS = 6;
const MAX_USERS = 3;

// Flat, keyboard-navigable result list; every item carries its route.
// A valid RID offers the direct jump — even for repos the index doesn't
// know — unless the index already contributes that repo's richer row.
const results = computed(() => {
  const q = input.value;
  const items = [];
  if (rid.value && !reposByRid.value.get(rid.value)) {
    items.push({
      type: "rid",
      key: rid.value,
      rid: rid.value,
      to: { name: "code", params: { rid: rid.value } },
    });
  }
  const repos = searchRepos(index.value?.repos ?? [], q)
    .slice(0, MAX_REPOS)
    .map((repo) => ({
      type: "repo",
      key: repo.rid,
      repo,
      to: { name: "code", params: { rid: repo.rid } },
    }));
  const users = searchUsers(index.value?.users ?? [], q)
    .slice(0, MAX_USERS)
    .map((user) => ({
      type: "user",
      key: user.did,
      user,
      to: { name: "user", params: { did: user.did } },
    }));
  return [...items, ...repos, ...users];
});

const open = computed(() => focused.value && results.value.length > 0);

function reset() {
  input.value = "";
  activeIdx.value = -1;
  focused.value = false;
}

function goTo(item) {
  router.push(item.to);
  reset();
}

function submit() {
  // Enter: keyboard selection wins, then the direct RID jump, then the
  // best match; with nothing to offer, the home directory search takes
  // over with the query prefilled.
  const selected = results.value[activeIdx.value] ?? results.value[0];
  if (selected) {
    goTo(selected);
    return;
  }
  const q = input.value.trim();
  if (q) {
    router.push({ name: "home", query: { q } });
    reset();
  }
}

function move(delta) {
  if (!results.value.length) return;
  const n = results.value.length;
  activeIdx.value = (activeIdx.value + delta + n) % n;
}

useClickOutside(root, () => (focused.value = false));
</script>

<template>
  <div ref="root" class="relative w-full">
    <input
      v-model="input"
      @focus="focused = true"
      @input="
        focused = true;
        activeIdx = -1;
      "
      @keydown.enter.prevent="submit"
      @keydown.down.prevent="move(1)"
      @keydown.up.prevent="move(-1)"
      @keydown.escape="focused = false"
      type="text"
      placeholder="Search or jump to… (rad:z…)"
      class="w-full px-3 py-1.5 text-sm rounded-md border border-border-default bg-canvas placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-accent-emphasis/40"
      role="combobox"
      :aria-expanded="open"
      aria-autocomplete="list"
    />

    <div
      v-if="open"
      role="listbox"
      class="absolute left-0 right-0 mt-1 rounded-md border border-border-default bg-canvas shadow-lg py-1 z-50 max-h-96 overflow-y-auto"
    >
      <button
        v-for="(item, i) in results"
        :key="item.type + item.key"
        @click="goTo(item)"
        @mousemove="activeIdx = i"
        role="option"
        :aria-selected="i === activeIdx"
        :class="[
          'w-full text-left px-3 py-2 text-sm flex items-center gap-2 cursor-pointer',
          i === activeIdx && 'bg-neutral-muted',
        ]"
      >
        <template v-if="item.type === 'rid'">
          <span aria-hidden="true">↳</span>
          <span class="truncate">
            Open <span class="font-mono text-accent">{{ item.rid }}</span>
          </span>
        </template>
        <template v-else-if="item.type === 'repo'">
          <span aria-hidden="true">📦</span>
          <span class="font-semibold shrink-0">{{ item.repo.name }}</span>
          <span class="text-fg-muted truncate">
            {{ item.repo.description }}
          </span>
          <span class="text-xs text-fg-muted ml-auto shrink-0">
            🌱 {{ item.repo.seeders }}
          </span>
        </template>
        <template v-else>
          <span
            class="w-4 h-4 rounded-full inline-block shrink-0 border border-border-muted"
            :style="{ background: identiconGradient(item.user.did) }"
            aria-hidden="true"
          />
          <span class="font-semibold">
            {{ item.user.alias ?? shortDid(item.user.did) }}
          </span>
          <span class="text-xs text-fg-muted ml-auto shrink-0">
            {{ item.user.maintains.length }} repos
          </span>
        </template>
      </button>
    </div>
  </div>
</template>
