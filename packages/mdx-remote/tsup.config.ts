import { defineConfig } from 'tsup';

export default defineConfig({
  external: ['fumadocs-core', 'next', 'react'],
  dts: true,
  target: 'es2021',
  env: {
    TSUP: '1',
  },
  entry: [
    './src/index.ts',
    './src/github/index.ts',
    './src/github/dev/index.ts',
  ],
  format: 'esm',
});
