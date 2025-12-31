import { defineConfig } from 'tsdown';

export default defineConfig({
  external: ['server-only', 'react'],
  dts: true,
  fixedExtension: false,
  target: 'es6',
  format: 'esm',
  entry: ['src/index.ts', 'src/ui/index.ts'],
});
