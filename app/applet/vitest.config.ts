import { defineConfig } from 'vitest/config';

export default defineConfig({
  server: {
    hmr: false,
  },
  test: {
    environment: 'node',
  },
});
