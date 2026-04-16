import { defineConfig } from 'tsdown';

export default defineConfig({
  dts: true,
  fixedExtension: false,
  target: 'es2023',
  entry: ['./src/index.ts', './src/dev/index.ts'],
  format: 'esm',
  exports: true,
  deps: {
    onlyBundle: ['ignore'],
    neverBundle: ['mdx/types'],
  },
});
