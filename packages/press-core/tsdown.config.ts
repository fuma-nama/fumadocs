import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts', 'src/plugins/*.{ts,tsx}'],
  format: 'esm',
  target: 'es2023',
  fixedExtension: false,
  dts: {
    sourcemap: false,
  },
  deps: {
    onlyBundle: [],
  },
});
