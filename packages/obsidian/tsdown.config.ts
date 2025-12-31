import { defineConfig } from 'tsdown';

export default defineConfig({
  external: ['react'],
  dts: true,
  fixedExtension: false,
  target: 'es6',
  format: 'esm',
  entry: ['src/index.ts', 'src/ui/index.tsx', 'src/mdx/index.ts'],
});
