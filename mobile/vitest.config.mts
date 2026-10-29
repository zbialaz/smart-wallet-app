import path from 'node:path';
import { defineConfig } from 'vitest/config';

/**
 * Vitest roda SOMENTE os testes do domínio (TypeScript puro, sem React Native).
 * Por isso é rápido: não precisa de simulador nem de banco.
 */
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
