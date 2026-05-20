import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['./src/*.ts'],
  target: 'es2023',
  format: 'esm',
  dts: true,
  fixedExtension: false,
  exports: true,
  deps: {
    onlyBundle: [],
  },
});
