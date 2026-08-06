import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/domain/**', 'src/application/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/domain': path.resolve(__dirname, './src/domain'),
      '@/application': path.resolve(__dirname, './src/application'),
      '@/adapters': path.resolve(__dirname, './src/adapters'),
      '@/shared': path.resolve(__dirname, './src/shared'),
    },
  },
});
