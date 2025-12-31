import { defineConfig } from 'tsdown';

export default defineConfig({
  dts: true,
  fixedExtension: false,
  target: 'es6',
  format: 'esm',
  entry: ['src/index.ts', 'src/cache-fs.ts', 'src/ui/index.ts'],
});
