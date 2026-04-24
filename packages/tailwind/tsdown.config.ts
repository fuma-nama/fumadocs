import { defineConfig } from 'tsdown';

export default defineConfig({
  format: 'esm',
  target: 'es2023',
  entry: ['./src/index.ts', './src/typography/index.ts'],
  dts: {
    sourcemap: false,
  },
  deps: {
    onlyBundle: ['@fastify/deepmerge', 'postcss-selector-parser', 'cssesc', 'util-deprecate'],
  },
  exports: true,
});
