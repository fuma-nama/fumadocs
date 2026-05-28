import { defineConfig } from 'tsdown';

export default defineConfig({
  format: 'esm',
  target: 'es2023',
  entry: ['./src/index.ts', './src/rsc.tsx'],
  unbundle: true,
  dts: {
    sourcemap: false,
  },
  platform: 'browser',
  exports: true,
  deps: {
    onlyBundle: [],
    neverBundle: [/^node:/],
  },
});
