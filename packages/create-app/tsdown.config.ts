import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['./src/bin.ts', './src/index.ts', './src/plugins/*'],
  format: 'esm',
  target: 'node22',
  dts: true,
  fixedExtension: false,
});
