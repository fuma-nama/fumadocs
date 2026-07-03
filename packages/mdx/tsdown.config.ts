import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: [
    './src/{index,bin}.ts',
    './src/{config,next,vite,bun,rolldown}/index.ts',
    './src/config/satteri/index.ts',
    './src/satteri/index.ts',
    './src/webpack/{mdx,meta}.ts',
    './src/node/{index,_loader,loader}.ts',
    './src/runtime/*.{ts,tsx}',
    './src/plugins/*.ts',
  ],
  format: 'esm',
  dts: {
    sourcemap: false,
  },
  target: 'es2023',
  platform: 'neutral',
  exports: {
    bin: false,
  },
  deps: {
    onlyBundle: ['@fumadocs/vite'],
    neverBundle: ['webpack', 'bun', /^node:/, '@fumadocs/satteri', 'satteri'],
  },
});
