import { defineConfig } from 'tsup';

export default defineConfig({
  dts: true,
  target: 'es2022',
  format: 'esm',
  entry: ['src/index.ts'],
});
