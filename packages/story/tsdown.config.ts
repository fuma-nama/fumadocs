import { defineConfig } from 'tsdown';

export default defineConfig({
  format: 'esm',
  target: 'es2023',
  entry: [
    './src/index.{ts,tsx}',
    './src/client/{index,with-control}.tsx',
    './src/type-tree/index.ts',
  ],
  unbundle: true,
  fixedExtension: false,
  dts: {
    sourcemap: false,
  },
});
