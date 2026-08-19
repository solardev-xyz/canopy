<script setup>
import { computed, onUnmounted, ref, watch } from "vue";
import { useRadicleStore } from "../stores/radicle.js";
import { useNetworkIndex } from "../lib/index-queries.js";

/**
 * The seed-to-browse experience for a repository that isn't on the user's
 * node yet: seed CTA (with network context from the index), live fetch
 * progress, automatic render when the repo lands, and an honest failure
 * state with a retry — never a raw node error as the primary message.
 *
 * Purely presentational: the store owns polling and refreshes the repo's
 * queries when the fetch lands, so this view updates itself away.
 */
const props = defineProps({
  rid: { type: String, required: true },
  error: { type: [Object, Error], default: null },
});

const radicle = useRadicleStore();
const { data: index } = useNetworkIndex();

const status = computed(() => radicle.seedProgress[props.rid] ?? null);
const state = computed(() => status.value?.state ?? "idle");
const indexEntry = computed(
  () => index.value?.repos?.find((r) => r.rid === props.rid) ?? null,
);
// Best available seeder count: live fetch discovery beats the index.
const seeders = computed(
  () => status.value?.seedersKnown ?? indexEntry.value?.seeders ?? null,
);

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

const actionError = ref(null);

async function run(action) {
  actionError.value = null;
  try {
    await action();
  } catch (err) {
    actionError.value = err.message;
  }
}
const seed = () => run(() => radicle.seed(props.rid));
const retry = () => run(() => radicle.retryFetch(props.rid));

// Pick up a fetch already in flight (page reload, background node retry)
// instead of showing a stale "not available". Per-view by design — the
// store doesn't resume every seeded rid globally.
watch(
  () => radicle.connected,
  (connected) => {
    if (connected) radicle.resumeTracking(props.rid);
  },
  { immediate: true },
);

// Elapsed-time ticker, alive only while a fetch runs.
const now = ref(Date.now());
let ticker = null;
watch(
  state,
  (s) => {
    if (s === "fetching" && !ticker) {
      now.value = Date.now();
      ticker = setInterval(() => (now.value = Date.now()), 1000);
    } else if (s !== "fetching" && ticker) {
      clearInterval(ticker);
      ticker = null;
    }
  },
  { immediate: true },
);
onUnmounted(() => ticker && clearInterval(ticker));

const elapsed = computed(() => {
  if (!status.value?.startedAt) return null;
  return Math.max(0, Math.round((now.value - status.value.startedAt) / 1000));
});

const failedAttempts = computed(
  () =>
    status.value?.recentAttempts?.filter((attempt) => !attempt.ok).length ?? 0,
);

const progress = computed(() => status.value?.progress ?? null);
const progressHeadline = computed(() => {
  switch (progress.value?.phase) {
    case "starting":
    case "resolving":
      return "Finding seeds…";
    case "connecting":
      return "Connecting to a seed…";
    case "fetching":
      return "Downloading repository…";
    case "peer-failed":
      return "Trying another seed…";
    default:
      return "Fetching from the network…";
  }
});
const progressPeer = computed(() => {
  const { index, total } = progress.value ?? {};
  return index && total ? `Seed ${index} of ${total}.` : null;
});

// Raw node/query errors belong behind a toggle, never as the headline.
const technicalDetail = computed(() => {
  if (state.value === "failed") return status.value?.lastError ?? null;
  if (state.value === "idle") return props.error?.message ?? null;
  return null;
});
</script>

<template>
  <div
    class="my-8 mx-auto max-w-lg border border-border-default rounded-md p-6 text-center"
  >
    <!-- fetching -->
    <template v-if="state === 'fetching'">
      <div class="text-3xl mb-2 animate-pulse" aria-hidden="true">🌱</div>
      <div class="text-lg font-semibold mb-1">{{ progressHeadline }}</div>
      <p class="text-sm text-fg-muted">
        <template v-if="progressPeer">{{ progressPeer }} </template>
        <template v-if="seeders !== null">
          {{ plural(seeders, "seed") }} known for this repository.
        </template>
        <template v-else>Looking for seeds…</template>
        <template v-if="elapsed !== null"> {{ elapsed }}s elapsed.</template>
      </p>
      <p v-if="failedAttempts > 0" class="text-sm text-fg-muted mt-1">
        {{ plural(failedAttempts, "attempt") }} did not complete — still trying
        other seeds.
      </p>
      <p class="text-xs text-fg-muted mt-3">
        Your node downloads the repository directly from its seeds. Large
        repositories can take a while.
      </p>
    </template>

    <!-- fetched: queries are refreshing, page is about to render -->
    <template v-else-if="state === 'fetched'">
      <div class="text-3xl mb-2" aria-hidden="true">✅</div>
      <div class="text-lg font-semibold mb-1">Repository fetched</div>
      <p class="text-sm text-fg-muted">Loading the page…</p>
    </template>

    <!-- failed: honest, with retry -->
    <template v-else-if="state === 'failed'">
      <div class="text-3xl mb-2" aria-hidden="true">⚠️</div>
      <div class="text-lg font-semibold mb-1">
        Your node couldn't fetch this repository
      </div>
      <p class="text-sm text-fg-muted">
        <template v-if="seeders === 0">
          No seeds for it are currently reachable — it may be offline-only or
          private.
        </template>
        <template v-else>
          All fetch attempts failed<template v-if="failedAttempts > 0">
            ({{ plural(failedAttempts, "seed") }} tried)</template
          >. This can happen with very large repositories or unreliable seeds.
          You can retry when another seed may be reachable.
        </template>
      </p>
      <button
        @click="retry"
        class="mt-4 px-4 py-2 text-sm rounded-md font-medium text-white bg-[var(--cnp-btn-primary-bg)] hover:opacity-90 cursor-pointer"
      >
        Try again
      </button>
    </template>

    <!-- idle: the seed CTA (or the paths to it) -->
    <template v-else>
      <div class="text-lg font-semibold mb-1">
        Repository not on your node yet
      </div>
      <p class="text-sm text-fg-muted">
        Your node only serves repositories it seeds.
        <template v-if="seeders !== null">
          {{ plural(seeders, "node") }} on the network seed{{
            seeders === 1 ? "s" : ""
          }}
          this repository.
        </template>
        <template v-else-if="index?.available && !indexEntry">
          It isn't listed in your network index — it may be new, private, or
          unreplicated.
        </template>
      </p>

      <div v-if="radicle.available" class="mt-4">
        <button
          v-if="radicle.connected"
          @click="seed"
          :disabled="radicle.busy"
          class="px-4 py-2 text-sm rounded-md font-medium text-white bg-[var(--cnp-btn-primary-bg)] hover:opacity-90 cursor-pointer disabled:opacity-50"
        >
          🌱 Seed this repository
        </button>
        <button
          v-else
          @click="radicle.connect()"
          class="px-4 py-2 text-sm rounded-md border border-border-default hover:bg-canvas-subtle cursor-pointer"
        >
          Connect your node to seed it
        </button>
      </div>
      <p v-else class="text-sm text-fg-muted mt-4">
        Open this page in Freedom Browser to fetch it with your own Radicle
        node.
      </p>
    </template>

    <details v-if="technicalDetail" class="mt-4 text-left">
      <summary class="text-xs text-fg-muted cursor-pointer">
        Technical details
      </summary>
      <pre class="text-xs text-fg-muted mt-1 whitespace-pre-wrap break-all">{{
        technicalDetail
      }}</pre>
    </details>

    <p v-if="actionError" class="text-danger text-sm mt-3">
      {{ actionError }}
    </p>
  </div>
</template>
