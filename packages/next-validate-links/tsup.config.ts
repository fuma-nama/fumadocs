import { defineConfig } from 'tsup';

export default defineConfig({
  dts: true,
  target: 'node18',
  entry: ['./src/index.ts'],
  format: 'esm',
});
