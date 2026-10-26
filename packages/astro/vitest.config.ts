import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      'virtual:fumadocs/mdx-components': path.resolve(
        import.meta.dirname,
        'test/fixtures/components.tsx',
      ),
    },
  },
  test: {
    environment: 'node',
  },
});
