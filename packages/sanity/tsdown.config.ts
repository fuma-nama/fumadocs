import { defineConfig } from 'tsdown';

export default defineConfig({
  dts: {
    sourcemap: false,
  },
  target: 'es2023',
  format: 'esm',
  entry: ['./src/{index,client}.ts', './src/plugin.tsx'],
  deps: {
    onlyBundle: [],
  },
  exports: true,
});
