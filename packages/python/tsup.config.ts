import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['./src/index.ts', './src/components/index.tsx'],
  format: 'esm',
  dts: true,
  target: 'es2022',
  external: ['react'],
});
