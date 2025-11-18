import { defineConfig } from 'tsup';

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
    external: ['next', 'typescript', 'bun'],
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
    external: ['next', 'typescript', 'bun'],
    dts: false,
    target: 'node22',
  },
]);
