import { defineConfig } from 'tsdown';

export default defineConfig({
  dts: true,
  fixedExtension: false,
  target: 'es2023',
  entry: [
    './src/index.ts',
    './src/cli.ts',
    './src/bin.ts',
    './src/dev/{shared,node-server,node-client,react-client}.ts',
  ],
  format: 'esm',
  exports: {
    bin: {
      'local-content': './src/bin.ts',
    },
    exclude: ['bin'],
  },
  deps: {
    onlyBundle: [],
    neverBundle: [],
  },
});
