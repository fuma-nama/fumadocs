import { defineConfig } from 'tsdown';

export default defineConfig({
  format: 'esm',
  target: 'es2023',
  entry: [
    './src/index.{ts,tsx}',
    './src/i18n.ts',
    './src/type-tree/index.ts',
    './src/vite.ts',
    './src/vite/client.tsx',
  ],
  unbundle: true,
  dts: {
    sourcemap: false,
  },
  platform: 'browser',
  exports: {
    customExports: {
      './css/*': './css/*',
    },
  },
  deps: {
    onlyBundle: ['@fastify/deepmerge', '@ungap/structured-clone', 'react-error-boundary'],
    neverBundle: [/^node:/],
  },
});
