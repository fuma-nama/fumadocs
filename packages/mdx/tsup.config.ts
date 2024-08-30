import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['./src/{index,loader-mdx}.ts', './src/{config,next}/index.ts'],
  format: 'esm',
  external: ['fumadocs-core', 'webpack', 'next', 'typescript'],
  dts: true,
  target: 'node18',
});
