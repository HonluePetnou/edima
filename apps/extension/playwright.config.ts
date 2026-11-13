import { defineConfig } from '@playwright/test';

// F-10: a real extension install (not the Vitest/jsdom unit suite) driven
// against the jury's own test page. Needs `pnpm build:extension` first —
// see e2e/safinum.spec.ts for why a persistent context + Edge is required.
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false, // one shared browser context (see safinum.spec.ts)
  retries: 0,
  reporter: 'list',
  use: {
    trace: 'retain-on-failure',
  },
});
