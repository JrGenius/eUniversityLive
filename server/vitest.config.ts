import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: { globalSetup: ['test/global-setup.ts'], testTimeout: 40_000, hookTimeout: 40_000, fileParallelism: false, env: { DISABLE_RATE_LIMIT: '1' } },
})
