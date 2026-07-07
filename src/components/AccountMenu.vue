<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useRadicleStore } from "../stores/radicle.js";
import { useNetworkIndex } from "../lib/index-queries.js";
import { identiconGradient } from "../lib/identicon.js";

/**
 * Classic account dropdown for the connected node identity: avatar,
 * profile link, seeded repositories, disconnect.
 *
 * The exact DID arrives via the store once the origin holds the signing
 * grant; before that, the profile link resolves it from the network
 * index by alias — public information either way. With no unambiguous
 * match the item is simply omitted.
 */
const radicle = useRadicleStore();
const router = useRouter();
const { data: index } = useNetworkIndex();

const open = ref(false);
const root = ref(null);

const userDid = computed(() => {
  if (radicle.did) return radicle.did;
  if (!radicle.alias) return null;
  const matches = (index.value?.users ?? []).filter(
    (u) => u.alias === radicle.alias,
  );
  return matches.length === 1 ? matches[0].did : null;
});

// Avatar keyed by the DID when known, the alias otherwise — matches the
// identicon on profile pages once the DID resolves.
const avatar = computed(() =>
  identiconGradient(userDid.value ?? radicle.alias ?? ""),
);

function go(route) {
  open.value = false;
  router.push(route);
}

async function disconnect() {
  open.value = false;
  await radicle.disconnect();
}

function onClickOutside(event) {
  if (open.value && root.value && !root.value.contains(event.target))
    open.value = false;
}
onMounted(() => document.addEventListener("click", onClickOutside));
onUnmounted(() => document.removeEventListener("click", onClickOutside));
</script>

<template>
  <div ref="root" class="relative shrink-0">
    <button
      @click="open = !open"
      class="inline-flex items-center gap-2 text-sm text-fg-muted hover:text-fg-default cursor-pointer px-2 py-1 rounded-md hover:bg-neutral-muted"
      title="Connected to your Radicle node"
      aria-haspopup="menu"
      :aria-expanded="open"
    >
      <span
        class="w-6 h-6 rounded-full inline-block shrink-0 border border-border-muted"
        :style="{ background: avatar }"
        aria-hidden="true"
      />
      <span class="hidden sm:inline font-medium text-fg-default">
        {{ radicle.alias ?? "node connected" }}
      </span>
      <span class="text-xs" aria-hidden="true">▾</span>
    </button>

    <div
      v-if="open"
      role="menu"
      class="absolute right-0 mt-1 w-52 rounded-md border border-border-default bg-canvas shadow-lg py-1 z-50"
    >
      <div class="px-3 py-2 border-b border-border-muted">
        <div class="text-sm font-semibold truncate">
          {{ radicle.alias ?? "your node" }}
        </div>
        <div class="text-xs text-fg-muted flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-success inline-block" />
          node connected
        </div>
      </div>
      <button
        v-if="userDid"
        @click="go({ name: 'user', params: { did: userDid } })"
        role="menuitem"
        class="w-full text-left px-3 py-2 text-sm hover:bg-neutral-muted cursor-pointer"
      >
        👤 Profile
      </button>
      <button
        @click="go({ name: 'seeded' })"
        role="menuitem"
        class="w-full text-left px-3 py-2 text-sm hover:bg-neutral-muted cursor-pointer"
      >
        📦 Repositories
      </button>
      <div class="border-t border-border-muted my-1" />
      <button
        @click="disconnect"
        role="menuitem"
        class="w-full text-left px-3 py-2 text-sm text-danger hover:bg-neutral-muted cursor-pointer"
      >
        Disconnect
      </button>
    </div>
  </div>
</template>
