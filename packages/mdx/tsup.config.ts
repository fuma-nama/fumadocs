import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    './src/{index,bin}.ts',
    './src/{config,next,vite,bun}/index.ts',
    './src/webpack/{mdx,meta}.ts',
    './src/node/loader.ts',
    './src/runtime/*.ts',
    './src/plugins/*.ts',
  ],
  format: ['esm', 'cjs'],
  external: ['next', 'typescript', 'bun'],
  dts: true,
  target: 'node18',
});
