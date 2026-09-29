import { defineConfig } from 'tsdown';

export default defineConfig({
  format: 'esm',
  target: 'es2023',
  entry: ['./src/index.ts', './src/bundle.ts', './src/react.ts'],
  fixedExtension: false,
  dts: {
    sourcemap: false,
  },
  sourcemap: false,
  deps: {
    onlyBundle: ['@fastify/deepmerge'],
    neverBundle: [/^node:/, 'fs'],
  },
  exports: true,
});
