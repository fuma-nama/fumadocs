import { defineConfig } from 'tsdown';

export default defineConfig({
  dts: {
    sourcemap: false,
  },
  target: 'es2023',
  format: 'esm',
  entry: ['./src/*'],
  deps: {
    onlyBundle: [],
  },
  exports: true,
});
