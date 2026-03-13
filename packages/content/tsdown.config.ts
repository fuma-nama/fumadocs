import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['./src/{index,runtime}.ts'],
  format: 'esm',
  dts: true,
  fixedExtension: false,
  target: 'es2023',
  deps: {
    onlyAllowBundle: [],
  },
  exports: {
    enabled: true,
  },
});
