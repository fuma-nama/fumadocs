import { defineConfig } from 'tsdown';

export default defineConfig({
  dts: true,
  fixedExtension: false,
  target: 'es2023',
  format: 'esm',
  entry: ['src/index.ts', 'src/remark-ts2js.ts'],
  inlineOnly: [],
});
