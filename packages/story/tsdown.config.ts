import { defineConfig } from 'tsdown';

export default defineConfig({
  format: 'esm',
  target: 'es2023',
  entry: [
    './src/index.{ts,tsx}',
    './src/client/index.tsx',
    './src/i18n.ts',
    './src/type-tree/index.ts',
  ],
  unbundle: true,
  fixedExtension: false,
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
