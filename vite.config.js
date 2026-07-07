import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";

// In Freedom Browser, canopy fetches Radicle data via `rad://<rid>/...`
// URLs, resolved by the browser's rad: protocol handler against the
// user's local radicle-httpd. In plain-Chrome dev, the same requests go
// through this proxy to a local dev httpd (scripts/dev-node.mjs) — still
// the developer's own node, never a hosted gateway.
const DEV_HTTPD = process.env.CANOPY_HTTPD ?? "http://127.0.0.1:8788";
// Optional: a local bee node for index-feed reads in plain-browser dev.
const DEV_BEE = process.env.CANOPY_BEE ?? "http://127.0.0.1:1633";

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  base: "./",
  server: {
    proxy: {
      // /rad/rad:<rid>/<path> -> <httpd>/api/v1/repos/rad:<rid>/<path>
      "/rad/": {
        target: DEV_HTTPD,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rad\//, "/api/v1/repos/"),
      },
      // /bzz/<ref>/<path> -> bee /bzz/<ref>/<path>; /bzz-health -> bee /health
      "/bzz": {
        target: DEV_BEE,
        changeOrigin: true,
        rewrite: (path) => (path === "/bzz-health" ? "/health" : path),
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: false,
  },
});
