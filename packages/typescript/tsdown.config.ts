import { defineConfig } from 'tsdown';

export default defineConfig({
  external: ['server-only', 'react'],
  dts: {
    sourcemap: false,
  },
  fixedExtension: false,
  target: 'es2023',
  format: 'esm',
  entry: ['src/index.ts', 'src/ui/index.ts'],
});
