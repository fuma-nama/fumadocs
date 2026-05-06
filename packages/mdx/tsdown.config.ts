import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: [
    './src/{index,bin}.ts',
    './src/{config,next,vite,bun}/index.ts',
    './src/webpack/{mdx,meta}.ts',
    './src/node/{index,_loader,loader}.ts',
    './src/runtime/*.{ts,tsx}',
    './src/plugins/*.ts',
  ],
  format: 'esm',
  dts: {
    sourcemap: false,
  },
  target: 'node22',
  exports: {
    bin: './src/bin.ts',
  },
  deps: {
    onlyBundle: [],
    neverBundle: ['webpack', 'bun'],
  },
});
