import { defineConfig } from 'tsup';

const external = ['next', 'typescript', 'bun'];

const noExternal = [
  // TODO: remove this when the min `fumadocs-core` version is above 16.2.3
  'fumadocs-core/source/schema',
];

export default defineConfig([
  {
    entry: [
      './src/{index,bin}.ts',
      './src/{config,next,vite,bun}/index.ts',
      './src/webpack/{mdx,meta}.ts',
      './src/node/loader.ts',
      './src/runtime/*.ts',
      './src/plugins/*.ts',
    ],
    format: 'esm',
    noExternal,
    external,
    dts: true,
    target: 'node22',
  },
  {
    entry: {
      // ensure Next.js CJS config compatibility
      // because next.config.ts by default uses CJS
      './next/index': './src/next/index.ts',
    },
    format: 'cjs',
    noExternal,
    external,
    dts: false,
    target: 'node22',
  },
]);
