import { onMounted, onUnmounted } from "vue";

/**
 * Invoke `onOutside` for document clicks landing outside `rootRef`'s
 * element — the dropdown-dismiss pattern (AccountMenu, TopSearch).
 */
export function useClickOutside(rootRef, onOutside) {
  function onClick(event) {
    if (rootRef.value && !rootRef.value.contains(event.target)) onOutside();
  }
  onMounted(() => document.addEventListener("click", onClick));
  onUnmounted(() => document.removeEventListener("click", onClick));
}
