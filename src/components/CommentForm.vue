<script setup>
import { ref } from 'vue';
import { useRadicleStore } from '../stores/radicle.js';
import { USER_REJECTED } from '../lib/provider.js';

const props = defineProps({
  placeholder: { type: String, default: 'Leave a comment' },
  submitLabel: { type: String, default: 'Comment' },
  onSubmit: { type: Function, required: true },
});

const radicle = useRadicleStore();
const body = ref('');
const sending = ref(false);
const error = ref(null);

async function submit() {
  if (!body.value.trim() || sending.value) return;
  sending.value = true;
  error.value = null;
  try {
    await props.onSubmit(body.value);
    body.value = '';
  } catch (err) {
    if (err.code !== USER_REJECTED) error.value = err.message;
  } finally {
    sending.value = false;
  }
}
</script>

<template>
  <div v-if="radicle.available" class="border border-border-default rounded-md">
    <template v-if="radicle.connected">
      <textarea
        v-model="body"
        :placeholder="placeholder"
        rows="4"
        class="w-full p-3 bg-canvas text-sm rounded-t-md focus:outline-none resize-y"
      />
      <div
        class="flex items-center justify-end gap-3 px-3 py-2 border-t border-border-default bg-canvas-subtle rounded-b-md"
      >
        <span v-if="error" class="text-danger text-xs mr-auto">{{ error }}</span>
        <button
          @click="submit"
          :disabled="!body.trim() || sending"
          class="px-4 py-1.5 text-sm rounded-md font-medium text-white bg-[var(--cnp-btn-primary-bg)] disabled:opacity-50 hover:opacity-90 cursor-pointer disabled:cursor-default"
        >
          {{ sending ? 'Signing…' : submitLabel }}
        </button>
      </div>
    </template>
    <div v-else class="p-4 text-sm text-fg-muted text-center">
      <button @click="radicle.connect()" class="text-accent hover:underline cursor-pointer">
        Connect your Radicle node
      </button>
      to join the conversation.
    </div>
  </div>
</template>
