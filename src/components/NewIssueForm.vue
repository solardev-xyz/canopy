<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useIssueActions } from '../lib/actions.js';
import { USER_REJECTED } from '../lib/provider.js';

const props = defineProps({ rid: { type: String, required: true } });
const emit = defineEmits(['close']);

const router = useRouter();
const actions = useIssueActions(props.rid);
const title = ref('');
const description = ref('');
const labels = ref('');
const sending = ref(false);
const error = ref(null);

async function submit() {
  if (!title.value.trim() || !description.value.trim() || sending.value) return;
  sending.value = true;
  error.value = null;
  try {
    const parsedLabels = labels.value
      .split(',')
      .map((l) => l.trim())
      .filter(Boolean);
    const { id } = await actions.createIssue({
      title: title.value,
      description: description.value,
      labels: parsedLabels,
    });
    emit('close');
    router.push({ name: 'issue', params: { rid: props.rid, id } });
  } catch (err) {
    if (err.code !== USER_REJECTED) error.value = err.message;
  } finally {
    sending.value = false;
  }
}
</script>

<template>
  <div class="border border-border-default rounded-md p-4 mb-4">
    <h2 class="font-semibold mb-3">New issue</h2>
    <input
      v-model="title"
      type="text"
      placeholder="Title"
      class="w-full px-3 py-2 mb-3 text-sm rounded-md border border-border-default bg-canvas focus:outline-none focus:ring-2 focus:ring-accent-emphasis/40"
    />
    <textarea
      v-model="description"
      rows="6"
      placeholder="Describe the issue (markdown supported)"
      class="w-full px-3 py-2 mb-3 text-sm rounded-md border border-border-default bg-canvas focus:outline-none focus:ring-2 focus:ring-accent-emphasis/40 resize-y"
    />
    <input
      v-model="labels"
      type="text"
      placeholder="Labels (comma-separated, optional)"
      class="w-full px-3 py-2 mb-3 text-sm rounded-md border border-border-default bg-canvas focus:outline-none"
    />
    <div class="flex items-center justify-end gap-3">
      <span v-if="error" class="text-danger text-xs mr-auto">{{ error }}</span>
      <button
        @click="emit('close')"
        class="px-3 py-1.5 text-sm rounded-md border border-border-default hover:bg-canvas-subtle cursor-pointer"
      >
        Cancel
      </button>
      <button
        @click="submit"
        :disabled="!title.trim() || !description.trim() || sending"
        class="px-4 py-1.5 text-sm rounded-md font-medium text-white bg-[var(--cnp-btn-primary-bg)] disabled:opacity-50 hover:opacity-90 cursor-pointer disabled:cursor-default"
      >
        {{ sending ? 'Signing…' : 'Submit new issue' }}
      </button>
    </div>
  </div>
</template>
