<script setup>
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import { useTree, useReadme } from "../lib/queries.js";
import LoadingBar from "../components/LoadingBar.vue";
import ErrorBox from "../components/ErrorBox.vue";
import MarkdownBody from "../components/MarkdownBody.vue";

const props = defineProps({ repo: { type: Object, required: true } });
const route = useRoute();

const rid = computed(() => props.repo.rid);
const head = computed(() => props.repo.head);
const path = computed(() => route.params.path ?? "");
const isRoot = computed(() => !path.value);

const { data: tree, isPending, error } = useTree(rid, head, path);
const { data: readme } = useReadme(rid, head);

const entries = computed(() => {
  const list = [...(tree.value?.entries ?? [])];
  // Folders first, then files — GitHub ordering.
  return list.sort((a, b) =>
    a.kind === b.kind
      ? a.name.localeCompare(b.name)
      : a.kind === "tree"
        ? -1
        : 1,
  );
});

const crumbs = computed(() => {
  if (!path.value) return [];
  const parts = path.value.split("/");
  return parts.map((name, i) => ({
    name,
    path: parts.slice(0, i + 1).join("/"),
  }));
});

const parentPath = computed(() => {
  const parts = (path.value ?? "").split("/");
  return parts.slice(0, -1).join("/");
});

const cloneCmd = computed(() => `rad clone ${rid.value}`);
const copied = ref(false);
async function copyClone() {
  try {
    await navigator.clipboard.writeText(cloneCmd.value);
    copied.value = true;
    setTimeout(() => (copied.value = false), 1500);
  } catch {
    // clipboard unavailable
  }
}

function entryRoute(entry) {
  const target = entry.kind === "tree" ? "tree" : "blob";
  return { name: target, params: { rid: rid.value, path: entry.path } };
}
</script>

<template>
  <div class="lg:grid lg:grid-cols-[1fr_296px] lg:gap-6">
    <div class="min-w-0">
      <!-- toolbar: branch + breadcrumb + clone -->
      <div class="flex items-center gap-2 mb-3 flex-wrap">
        <span
          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border border-border-default bg-canvas-subtle font-medium"
          :title="`head ${repo.head}`"
        >
          <span class="text-fg-muted">⎇</span>
          {{ repo.defaultBranch }}
        </span>
        <nav
          v-if="crumbs.length"
          class="text-sm flex items-center gap-1 flex-wrap min-w-0"
        >
          <RouterLink
            :to="{ name: 'code', params: { rid } }"
            class="text-accent hover:underline"
          >
            {{ repo.name }}
          </RouterLink>
          <template v-for="(c, i) in crumbs" :key="c.path">
            <span class="text-fg-muted">/</span>
            <RouterLink
              v-if="i < crumbs.length - 1"
              :to="{ name: 'tree', params: { rid, path: c.path } }"
              class="text-accent hover:underline"
            >
              {{ c.name }}
            </RouterLink>
            <span v-else class="font-semibold">{{ c.name }}</span>
          </template>
        </nav>
        <div v-if="isRoot" class="ml-auto flex items-center">
          <code
            class="text-xs font-mono px-3 py-1.5 border border-border-default rounded-l-md bg-canvas-subtle"
          >
            {{ cloneCmd }}
          </code>
          <button
            @click="copyClone"
            class="text-xs px-2 py-1.5 border border-l-0 border-border-default rounded-r-md hover:bg-neutral-muted cursor-pointer"
            title="Copy clone command"
          >
            {{ copied ? "✓" : "⧉" }}
          </button>
        </div>
      </div>

      <LoadingBar v-if="isPending" variant="list" :count="10" />
      <ErrorBox
        v-else-if="error"
        title="Could not load directory"
        :error="error"
      />
      <template v-else>
        <!-- file table -->
        <div
          class="border border-border-default rounded-md overflow-hidden mb-4"
        >
          <table class="w-full text-sm">
            <tbody>
              <tr
                v-if="!isRoot"
                class="border-b border-border-muted last:border-0"
              >
                <td class="px-4 py-2">
                  <RouterLink
                    :to="
                      parentPath
                        ? { name: 'tree', params: { rid, path: parentPath } }
                        : { name: 'code', params: { rid } }
                    "
                    class="text-accent hover:underline font-mono"
                  >
                    ..
                  </RouterLink>
                </td>
              </tr>
              <tr
                v-for="entry in entries"
                :key="entry.oid"
                class="border-b border-border-muted last:border-0 hover:bg-canvas-subtle"
              >
                <td class="px-4 py-2">
                  <RouterLink
                    :to="entryRoute(entry)"
                    class="hover:text-accent hover:underline inline-flex items-center gap-2"
                  >
                    <span aria-hidden="true">{{
                      entry.kind === "tree" ? "📁" : "📄"
                    }}</span>
                    {{ entry.name }}
                  </RouterLink>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- README (root only) -->
        <div
          v-if="isRoot && readme"
          class="border border-border-default rounded-md"
        >
          <div
            class="px-4 py-2 border-b border-border-default text-sm font-semibold bg-canvas-subtle rounded-t-md"
          >
            {{ readme.name }}
          </div>
          <div class="p-6">
            <MarkdownBody :source="readme.content" />
          </div>
        </div>
      </template>
    </div>

    <!-- About sidebar -->
    <aside v-if="isRoot" class="mt-6 lg:mt-0">
      <h2 class="font-semibold mb-2">About</h2>
      <p class="text-sm text-fg-muted mb-4">
        {{ repo.description || "No description" }}
      </p>
      <dl class="text-sm space-y-2">
        <div>
          <dt class="text-fg-muted text-xs uppercase tracking-wide mb-1">
            Default branch
          </dt>
          <dd class="font-mono">{{ repo.defaultBranch }}</dd>
        </div>
        <div>
          <dt class="text-fg-muted text-xs uppercase tracking-wide mb-1">
            Head
          </dt>
          <dd class="font-mono text-xs">{{ repo.head?.slice(0, 12) }}</dd>
        </div>
        <div v-if="repo.seeding != null">
          <dt class="text-fg-muted text-xs uppercase tracking-wide mb-1">
            Seeding
          </dt>
          <dd>{{ repo.seeding }} node{{ repo.seeding === 1 ? "" : "s" }}</dd>
        </div>
        <div>
          <dt class="text-fg-muted text-xs uppercase tracking-wide mb-1">
            Delegates ({{ repo.threshold }}-of-{{ repo.delegates.length }})
          </dt>
          <dd class="space-y-1">
            <RouterLink
              v-for="d in repo.delegates"
              :key="d"
              :to="{ name: 'user', params: { did: d } }"
              class="font-mono text-xs truncate block hover:text-accent hover:underline"
              :title="d"
            >
              {{ d.replace("did:key:", "") }}
            </RouterLink>
          </dd>
        </div>
      </dl>
    </aside>
  </div>
</template>
