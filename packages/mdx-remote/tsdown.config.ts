import { defineConfig } from 'tsdown';

export default defineConfig({
  external: ['mdx/types'],
  dts: true,
  fixedExtension: false,
  target: 'es2023',
  entry: ['./src/index.ts', './src/client/index.ts'],
  format: 'esm',
  inlineOnly: [],
});
