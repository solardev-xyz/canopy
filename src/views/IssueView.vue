<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useIssue } from "../lib/queries.js";
import { formatTimestamp, shortDid } from "../lib/rad-api.js";
import LoadingBar from "../components/LoadingBar.vue";
import ErrorBox from "../components/ErrorBox.vue";
import StateBadge from "../components/StateBadge.vue";
import CommentCard from "../components/CommentCard.vue";
import CommentForm from "../components/CommentForm.vue";
import { useIssueActions } from "../lib/actions.js";
import { useRadicleStore } from "../stores/radicle.js";
import { USER_REJECTED } from "../lib/provider.js";

const props = defineProps({ repo: { type: Object, required: true } });
const route = useRoute();
const rid = computed(() => props.repo.rid);
const id = computed(() => route.params.id);

const { data: issue, isPending, error } = useIssue(rid, id);
const radicle = useRadicleStore();
const actions = useIssueActions(props.repo.rid);

const comment = (body) => actions.commentIssue(id.value, body);
async function setState(state) {
  try {
    await actions.setIssueState(id.value, state);
  } catch (err) {
    if (err.code !== USER_REJECTED) throw err;
  }
}
</script>

<template>
  <div class="max-w-4xl">
    <LoadingBar v-if="isPending" variant="detail" />
    <ErrorBox v-else-if="error" title="Could not load issue" :error="error" />
    <template v-else-if="issue">
      <div class="pb-4 border-b border-border-default mb-4">
        <h1 class="text-2xl mb-2">
          {{ issue.title }}
          <span class="text-fg-muted font-mono text-base"
            >#{{ issue.id.slice(0, 7) }}</span
          >
        </h1>
        <div class="flex items-center gap-2 text-sm text-fg-muted flex-wrap">
          <StateBadge kind="issue" :state="issue.state" />
          <span>
            <RouterLink
              :to="{ name: 'user', params: { did: issue.author.id } }"
              class="font-semibold text-fg-default hover:text-accent hover:underline"
            >
              {{ issue.author.alias ?? shortDid(issue.author.id) }}
            </RouterLink>
            opened this issue
            {{ formatTimestamp(issue.discussion?.[0]?.timestamp) }} ·
            {{ issue.discussion.length }} comment{{
              issue.discussion.length === 1 ? "" : "s"
            }}
          </span>
          <span
            v-for="label in issue.labels"
            :key="label"
            class="text-xs px-2 py-0.5 rounded-full border border-border-default"
          >
            {{ label }}
          </span>
        </div>
      </div>

      <div class="space-y-4">
        <CommentCard v-for="c in issue.discussion" :key="c.id" :comment="c" />

        <CommentForm :on-submit="comment" />

        <div
          v-if="radicle.available && radicle.connected"
          class="flex justify-end gap-2 text-sm"
        >
          <button
            v-if="issue.state.status === 'open'"
            @click="setState('closed')"
            class="px-3 py-1.5 rounded-md border border-border-default hover:bg-canvas-subtle cursor-pointer"
          >
            ⊘ Close issue
          </button>
          <button
            v-else
            @click="setState('open')"
            class="px-3 py-1.5 rounded-md border border-border-default hover:bg-canvas-subtle cursor-pointer"
          >
            ⊙ Reopen issue
          </button>
        </div>
      </div>
    </template>
  </div>
</template>
