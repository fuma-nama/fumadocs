import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    './src/{index,loader-mdx}.ts',
    './src/{config,next,vite,bun}/index.ts',
    './src/node/loader.ts',
    './src/config/zod-3.ts',
    './src/runtime/async.ts',
    './src/runtime/vite/{browser,server}.ts',
  ],
  format: ['esm', 'cjs'],
  external: ['next', 'typescript', 'bun'],
  dts: true,
  target: 'node18',
});
