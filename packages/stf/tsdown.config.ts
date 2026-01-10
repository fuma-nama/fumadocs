import { defineConfig } from 'tsdown';

export default defineConfig({
  format: 'esm',
  target: 'es2023',
  entry: ['./src/index.ts'],
  fixedExtension: false,
  dts: true,
  exports: true,
});
