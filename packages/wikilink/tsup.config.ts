import { defineConfig } from 'tsup';

export default defineConfig({
  dts: true,
  target: 'es6',
  format: 'esm',
  entry: ['src/index.ts'],
});
