import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    './src/{index,loader-mdx}.ts',
    './src/{config,next,vite}/index.ts',
    './src/config/zod-3.ts',
    './src/runtime/{async,vite}.ts',
  ],
  format: ['esm', 'cjs'],
  external: ['next', 'typescript'],
  dts: true,
  target: 'node18',
});
