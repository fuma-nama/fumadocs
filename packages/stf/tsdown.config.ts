import { defineConfig } from 'tsdown';

export default defineConfig({
  format: 'esm',
  target: 'es2023',
  entry: ['./src/index.{ts,tsx}', './src/lib/utils.ts'],
  fixedExtension: false,
  dts: {
    sourcemap: false,
  },
  exports: true,
});
