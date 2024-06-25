import { defineConfig } from 'tsup';

export default defineConfig({
  external: ['fumadocs-core', 'next', 'react'],
  dts: true,
  target: 'es2021',
  entry: [
    './src/index.ts',
    './src/github/index.ts',
    './src/github/next/index.ts',
    './src/github/dev/index.ts',
  ],
  format: 'esm',
});
