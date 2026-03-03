import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['./src/index.ts'],
  format: 'esm',
  dts: true,
  fixedExtension: false,
  target: 'node18',
  inlineOnly: [],
});
