import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';

// In Freedom Browser, canopy fetches Radicle data via `rad://<rid>/...`
// URLs, resolved by the browser's rad: protocol handler against the
// user's local radicle-httpd. In plain-Chrome dev, the same requests go
// through this proxy to a local dev httpd (scripts/dev-node.mjs) — still
// the developer's own node, never a hosted gateway.
const DEV_HTTPD = process.env.CANOPY_HTTPD ?? 'http://127.0.0.1:8788';

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  base: './',
  server: {
    proxy: {
      // /rad/rad:<rid>/<path> -> <httpd>/api/v1/repos/rad:<rid>/<path>
      '/rad/': {
        target: DEV_HTTPD,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rad\//, '/api/v1/repos/'),
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: false,
  },
});
