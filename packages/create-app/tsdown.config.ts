import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['./src/bin.ts', './src/index.ts', './src/plugins/*.ts'],
  format: 'esm',
  target: 'node22',
  dts: { sourcemap: false },
  fixedExtension: false,
  deps: {
    onlyBundle: ['fuma-cli'],
  },
});
