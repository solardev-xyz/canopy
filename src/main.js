import { createApp } from "vue";
import { createPinia } from "pinia";
import { VueQueryPlugin, QueryClient } from "@tanstack/vue-query";
import { persistQueryClient } from "@tanstack/query-persist-client-core";
import { get, set, del } from "idb-keyval";
import App from "./App.vue";
import { router } from "./router.js";
import "./style.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Repo data changes only when the node syncs; avoid refetch storms.
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
      // Keep entries around long enough to be worth persisting.
      gcTime: 1000 * 60 * 60 * 24,
    },
  },
});

// Persist the query cache to IndexedDB (the swarmit pattern) so reloads
// hydrate instantly and revalidate in the background. `buster` invalidates
// the persisted cache when response shapes change.
persistQueryClient({
  queryClient,
  persister: {
    persistClient: async (client) => {
      await set("canopy-query-cache", client);
    },
    restoreClient: async () => {
      return await get("canopy-query-cache");
    },
    removeClient: async () => {
      await del("canopy-query-cache");
    },
  },
  maxAge: 1000 * 60 * 60 * 24,
  buster: "v1",
});

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.use(VueQueryPlugin, { queryClient });
app.mount("#app");
