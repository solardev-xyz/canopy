<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import { usePatch } from "../lib/queries.js";
import { formatTimestamp, shortDid } from "../lib/rad-api.js";
import LoadingBar from "../components/LoadingBar.vue";
import ErrorBox from "../components/ErrorBox.vue";
import StateBadge from "../components/StateBadge.vue";
import MarkdownBody from "../components/MarkdownBody.vue";
import CommentCard from "../components/CommentCard.vue";
import CommentForm from "../components/CommentForm.vue";
import AuthorChip from "../components/AuthorChip.vue";
import { usePatchActions } from "../lib/actions.js";

const props = defineProps({ repo: { type: Object, required: true } });
const route = useRoute();
const rid = computed(() => props.repo.rid);
const id = computed(() => route.params.id);

const { data: patch, isPending, error } = usePatch(rid, id);

// Newest revision last — mirror GitHub's oldest-first conversation order.
const revisions = computed(() => patch.value?.revisions ?? []);

const verdictLabel = { accept: "approved", reject: "requested changes" };

const actions = usePatchActions(props.repo.rid);
// Comments land on the latest revision, like commenting on a PR's HEAD.
const comment = (body) =>
  actions.commentPatch(id.value, body, revisions.value.at(-1)?.id);
</script>

<template>
  <div class="max-w-4xl">
    <LoadingBar v-if="isPending" />
    <ErrorBox v-else-if="error" title="Could not load patch" :error="error" />
    <template v-else-if="patch">
      <div class="pb-4 border-b border-border-default mb-4">
        <h1 class="text-2xl mb-2">
          {{ patch.title }}
          <span class="text-fg-muted font-mono text-base"
            >#{{ patch.id.slice(0, 7) }}</span
          >
        </h1>
        <div class="flex items-center gap-2 text-sm text-fg-muted flex-wrap">
          <StateBadge kind="patch" :state="patch.state" />
          <span>
            <RouterLink
              :to="{ name: 'user', params: { did: patch.author.id } }"
              class="font-semibold text-fg-default hover:text-accent hover:underline"
            >
              {{ patch.author.alias ?? shortDid(patch.author.id) }}
            </RouterLink>
            wants to merge into
            <code
              class="font-mono text-xs px-1.5 py-0.5 bg-neutral-muted rounded"
            >
              {{ patch.target }}
            </code>
          </span>
        </div>
      </div>

      <div class="space-y-6">
        <div
          v-for="(rev, i) in revisions"
          :key="rev.id"
          class="border-l-2 border-border-muted pl-4"
        >
          <div class="text-sm mb-2">
            <span class="font-semibold">Revision {{ i + 1 }}</span>
            <span class="text-fg-muted">
              · {{ rev.id.slice(0, 7) }} ·
              {{ formatTimestamp(rev.timestamp) }} · base
              <code class="font-mono text-xs">{{ rev.base?.slice(0, 7) }}</code>
              → head
              <code class="font-mono text-xs">{{ rev.oid?.slice(0, 7) }}</code>
            </span>
          </div>

          <div
            v-if="rev.description"
            class="border border-border-default rounded-md p-4 mb-3"
          >
            <MarkdownBody :source="rev.description" />
          </div>

          <div v-if="rev.reviews?.length" class="space-y-2 mb-3">
            <div
              v-for="review in rev.reviews"
              :key="review.author?.id"
              class="text-sm flex items-center gap-2"
            >
              <AuthorChip :author="review.author" />
              <span
                :class="
                  review.verdict === 'accept' ? 'text-success' : 'text-danger'
                "
                class="font-medium"
              >
                {{
                  verdictLabel[review.verdict] ?? review.verdict ?? "reviewed"
                }}
              </span>
              <span v-if="review.summary" class="text-fg-muted"
                >— {{ review.summary }}</span
              >
            </div>
          </div>

          <div v-if="rev.discussions?.length" class="space-y-3">
            <CommentCard
              v-for="c in rev.discussions"
              :key="c.id"
              :comment="c"
            />
          </div>
        </div>
      </div>

      <div
        v-if="patch.merges?.length"
        class="mt-6 text-sm text-done font-medium"
      >
        ✓ Merged by
        {{
          patch.merges
            .map((m) => m.author?.alias ?? shortDid(m.author?.id))
            .join(", ")
        }}
      </div>

      <div class="mt-6">
        <CommentForm
          :on-submit="comment"
          placeholder="Comment on the latest revision"
        />
      </div>
    </template>
  </div>
</template>
