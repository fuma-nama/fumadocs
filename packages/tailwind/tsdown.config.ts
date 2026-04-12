import { defineConfig } from 'tsdown';

export default defineConfig({
  format: 'esm',
  target: 'es2023',
  entry: ['./src/compile.ts', './src/typography/index.ts'],
  dts: {
    sourcemap: false,
  },
  deps: {
    onlyBundle: ['lodash.merge', 'postcss-selector-parser', 'cssesc', 'util-deprecate'],
  },
  exports: true,
});
