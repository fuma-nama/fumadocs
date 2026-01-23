import { defineConfig } from 'tsdown';

export default defineConfig({
  format: 'esm',
  target: 'es2023',
  entry: ['./src/**/*.{ts,tsx}', '!./src/_registry'],
  fixedExtension: false,
  dts: {
    sourcemap: false,
  },
});
