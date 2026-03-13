import { defineConfig } from 'tsdown';

const external = ['next', 'typescript', 'webpack', 'bun', 'mdx/types'];

const noExternal = [
  // TODO: remove this when the min `fumadocs-core` version is above 16.2.3
  'fumadocs-core/source/schema',
  // TODO: remove this when the min `fumadocs-core` version is above 16.6.17
  'fumadocs-core/mdx-plugins/remark-llms',
];

export default defineConfig([
  {
    entry: [
      './src/{index,bin}.ts',
      './src/{config,next,vite,bun}/index.ts',
      './src/webpack/{mdx,meta}.ts',
      './src/node/loader.ts',
      './src/runtime/*.{ts,tsx}',
      './src/plugins/*.ts',
    ],
    format: 'esm',
    dts: true,
    fixedExtension: false,
    target: 'node22',
    deps: {
      onlyBundle: [],
      alwaysBundle: noExternal,
      neverBundle: external,
    },
  },
  {
    outDir: 'dist/next',
    // ensure Next.js CJS config compatibility
    // because next.config.ts by default uses CJS
    entry: ['./src/next/index.ts'],
    format: 'cjs',
    dts: false,
    fixedExtension: false,
    target: 'node22',
    deps: {
      onlyBundle: [],
      alwaysBundle: noExternal,
      neverBundle: external,
    },
  },
]);
