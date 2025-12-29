import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['./src/index.ts', './src/components/index.tsx'],
  format: 'esm',
  dts: true,
  fixedExtension: false,
  target: 'es2022',
  external: ['react'],
});
