import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  test: {
    environment: 'node',
    // Edge function logic lives outside src/, but the targeting rules that decide
    // who receives an email are covered by tests and must run in CI too.
    include: ['src/**/*.test.ts', 'supabase/functions/**/*.test.ts'],
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
