import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['./src/index.ts'],
  target: 'es2023',
  format: 'esm',
  dts: true,
  fixedExtension: false,
  deps: {
    onlyBundle: [],
  },
});
