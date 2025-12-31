import { defineConfig } from 'tsdown';

export default defineConfig({
  external: ['fumadocs-core', 'next', 'react'],
  dts: true,
  fixedExtension: false,
  target: 'es2021',
  entry: ['./src/index.ts', './src/client/index.ts'],
  format: 'esm',
});
