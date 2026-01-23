import { defineConfig } from 'tsdown';

export default defineConfig({
  fixedExtension: false,
  target: 'es2023',
  format: 'esm',
  entry: ['src/index.ts', 'src/cache-fs.ts', 'src/ui/index.ts'],
  dts: {
    sourcemap: false,
  },
});
