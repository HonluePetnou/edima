import { defineConfig } from 'wxt';
import preact from '@preact/preset-vite';

// See https://wxt.dev/api/reference/wxt/interfaces/inlineconfig.html
export default defineConfig({
  srcDir: '.',
  manifest: {
    name: 'Edima',
    description: "Edima explique n'importe quel service financier en ligne, à l'écrit et à l'oral, dans ta langue.",
    permissions: ['sidePanel', 'storage'],
    // F9's fallback server (apps/server) — localhost only until it's
    // actually deployed somewhere. See apps/extension/utils/server-config.ts.
    host_permissions: ['http://localhost:8787/*'],
  },
  vite: () => ({
    plugins: [preact()],
  }),
});
