import { defineConfig } from 'tsdown';

export default defineConfig({
  dts: true,
  fixedExtension: false,
  target: 'es2023',
  entry: ['./src/index.ts', './src/dev/vite/index.ts', './src/dev/ws/{index,server,react}.ts'],
  format: 'esm',
  exports: true,
  deps: {
    onlyBundle: [],
    neverBundle: [],
  },
});
