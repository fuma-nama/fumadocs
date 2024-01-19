import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['./src/{config,index,loader,loader-mdx}.ts'],
  format: 'esm',
  external: ['fumadocs-core', 'webpack'],
  dts: true,
  target: 'es6',
});
