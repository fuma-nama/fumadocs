import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    './src/{index,loader-mdx}.ts',
    './src/{config,next}/index.ts',
    './src/runtime/mdx.ts',
  ],
  format: ['esm', 'cjs'],
  external: ['next', 'typescript'],
  dts: true,
  target: 'node18',
});
