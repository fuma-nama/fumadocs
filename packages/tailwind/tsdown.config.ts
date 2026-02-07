import { defineConfig } from 'tsdown';

export default defineConfig({
  format: 'esm',
  target: 'es2023',
  entry: ['./src/compile.ts', './src/typography/index.ts'],
  fixedExtension: false,
  dts: {
    sourcemap: false,
  },
  external: ['@tailwindcss/oxide'],
  inlineOnly: ['lodash.merge'],
});
