import { configDefaults, defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [preact()],
  test: {
    environment: 'jsdom',
    // e2e/ is Playwright (playwright.config.ts, `pnpm test:e2e`), not Vitest —
    // it imports @playwright/test's `test`, which Vitest can't run.
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
});
