import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['./src/{config,index,loader,loader-mdx}.ts'],
  format: 'esm',
  external: ['fumadocs-core', 'webpack', 'next', 'typescript'],
  dts: true,
  target: 'node18',
});
