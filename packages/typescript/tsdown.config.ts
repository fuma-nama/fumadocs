import { defineConfig } from 'tsdown';

export default defineConfig({
  dts: {
    sourcemap: false,
  },
  fixedExtension: false,
  target: 'es2023',
  format: 'esm',
  entry: ['src/index.ts', 'src/ui/index.ts'],
  deps: {
    onlyAllowBundle: [],
    neverBundle: ['server-only'],
  },
});
