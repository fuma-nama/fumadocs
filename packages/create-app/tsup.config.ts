import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['./src/bin.ts', './src/index.ts', './src/plugins/*'],
  format: 'esm',
  target: 'node20',
  dts: true,
});
