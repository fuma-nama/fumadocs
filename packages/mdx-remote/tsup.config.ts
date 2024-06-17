import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['./src/index.ts', './src/github/index.ts'],
  format: 'esm',
  external: ['fumadocs-core', 'next', 'react'],
  dts: true,
  target: 'esnext',
});
