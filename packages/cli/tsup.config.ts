import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['./src/index.ts', './src/build/index.ts'],
  format: 'esm',
  dts: true,
  target: 'node20',
});
