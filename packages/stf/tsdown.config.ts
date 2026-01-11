import { defineConfig } from 'tsdown';

export default defineConfig({
  format: 'esm',
  target: 'es2023',
  entry: ['./src/{index,client}.{ts,tsx}', './src/nodes/*', './src/lib/utils.ts'],
  fixedExtension: false,
  dts: true,
  exports: true,
});
