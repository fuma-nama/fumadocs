import { defineConfig } from 'tsdown';

export default defineConfig({
  target: 'es2023',
  format: 'esm',
  entry: ['src/config/index.ts', 'src/cli/index.ts'],
  outDir: 'dist/lib',
  dts: true,
  deps: {
    onlyAllowBundle: [],
  },
});
