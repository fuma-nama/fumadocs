import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['./src/index.ts'],
  format: 'esm',
  target: 'es2023',
  fixedExtension: false,
  dts: {
    sourcemap: false,
  },
  exports: true,
  deps: {
    onlyBundle: [],
  },
});
