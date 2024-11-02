import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['./src/{index,loader-mdx}.ts', './src/{config,next}/index.ts'],
  format: 'esm',
  external: ['next', 'typescript'],
  dts: true,
  target: 'node18',
});
