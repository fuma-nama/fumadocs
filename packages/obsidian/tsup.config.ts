import { defineConfig } from 'tsup';

export default defineConfig({
  external: ['react'],
  dts: true,
  target: 'es6',
  format: 'esm',
  entry: ['src/index.ts', 'src/ui/index.tsx', 'src/mdx/index.ts'],
});
