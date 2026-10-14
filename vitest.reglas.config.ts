import { defineConfig } from 'vitest/config';

// Tests de las reglas de Firestore: necesitan el emulador
// (npm run test:reglas, o el workflow de GitHub).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['reglas/**/*.test.ts'],
    testTimeout: 20000,
    fileParallelism: false,
  },
});
