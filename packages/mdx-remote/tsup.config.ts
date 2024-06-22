import { defineConfig } from 'tsup';

export default defineConfig({
  external: [
    'fumadocs-core',
    'webpack',
    'next',
    'react',
    '@fumadocs/mdx-remote',
  ],
  dts: true,
  target: 'esnext',
  env: {
    TSUP: '1',
  },
  entry: [
    './src/index.ts',
    './src/github/{index,source}.ts',
    './src/github/dev/{index,client}.ts',
  ],
  format: 'esm',
});
