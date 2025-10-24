import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    './src/{index,bin}.ts',
    './src/{config,webpack,next,vite,bun}/index.ts',
    './src/node/loader.ts',
    './src/runtime/next/{index,async}.ts',
    './src/runtime/vite/{browser,server}.ts',
    './src/plugins/{index,json-schema}.ts',
  ],
  format: ['esm', 'cjs'],
  external: ['next', 'typescript', 'bun'],
  dts: true,
  target: 'node18',
});
