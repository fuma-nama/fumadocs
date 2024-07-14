import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['./src/index.ts', './src/ui/index.ts'],
  format: 'esm',
  external: ['shiki'],
  dts: true,
  target: 'es2022',
});
