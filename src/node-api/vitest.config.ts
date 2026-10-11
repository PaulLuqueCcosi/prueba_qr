import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // server.ts only boots the process (listen + exit); it is exercised by manual runs.
      exclude: ['src/**/*.test.ts', 'src/main/server.ts'],
      reporter: [['text', { skipFull: false }], 'html'],
    },
  },
});
