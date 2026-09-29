import { defineConfig } from 'tsdown';

export default defineConfig({
  dts: true,
  fixedExtension: false,
  target: 'es2023',
  entry: ['./src/{index,client}.ts', './src/bin.ts', './src/dev/{react-client,vite,ws}.ts'],
  format: 'esm',
  exports: {
    bin: {
      'local-html': './src/bin.ts',
    },
    exclude: ['bin'],
  },
  deps: {
    onlyBundle: [],
    neverBundle: [],
  },
});
