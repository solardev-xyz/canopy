import { createApp } from "vue";
import { createPinia } from "pinia";
import { VueQueryPlugin } from "@tanstack/vue-query";
import { persistQueryClient } from "@tanstack/query-persist-client-core";
import { get, set, del } from "idb-keyval";
import App from "./App.vue";
import { router } from "./router.js";
import { queryClient } from "./lib/query-client.js";
import "./style.css";

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
