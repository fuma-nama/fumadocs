import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['./src/index.ts', './src/components/index.tsx'],
  format: 'esm',
  dts: {
    sourcemap: false,
  },
  fixedExtension: false,
  target: 'es2023',
  external: ['react'],
});
