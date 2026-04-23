import { defineConfig } from 'tsdown';

export default defineConfig({
  dts: true,
  fixedExtension: false,
  target: 'es2023',
  entry: [
    './src/{index,client}.ts',
    './src/bin.ts',
    './src/js/*',
    './src/dev/{node-server,node-client,react-client}.ts',
  ],
  format: 'esm',
  exports: {
    bin: {
      'local-md': './src/bin.ts',
    },
    exclude: ['bin'],
  },
  deps: {
    onlyBundle: [],
    neverBundle: [],
  },
});
