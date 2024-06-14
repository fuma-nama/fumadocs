import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['./src/index.ts'],
  format: 'esm',
  external: ['fumadocs-core', 'next-mdx-remote', 'next', 'react'],
  dts: true,
  target: 'esnext',
});
