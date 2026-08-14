import { defineConfig } from 'tsdown';

export default defineConfig({
  dts: true,
  fixedExtension: false,
  target: 'es2023',
  entry: ['./src/{index,client}.ts'],
  format: 'esm',
  deps: {
    onlyBundle: [],
    neverBundle: [],
  },
});
