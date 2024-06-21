import { defineConfig, type Options } from 'tsup';

const baseOptions: Options = {
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
};

export default defineConfig([
  {
    entry: ['./src/index.ts', './src/github/{index,source}.ts'],
    format: 'esm',
    ...baseOptions,
  },
  {
    ...baseOptions,
    entry: {
      'github/loader': './src/github/loader.ts',
    },
    format: 'cjs',
    dts: false,
  },
]);
