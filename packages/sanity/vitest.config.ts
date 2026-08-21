import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    environment: 'node',
    include: ['test/**/*.test.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@/': new URL('./src/', import.meta.url).pathname,
    },
  },
});
