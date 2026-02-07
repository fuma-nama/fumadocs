import { defineConfig } from 'tsdown';

export default defineConfig({
  fixedExtension: false,
  target: 'es2023',
  format: 'esm',
  dts: true,
  entry: ['src/index.ts', 'src/ui/index.tsx', 'src/mdx/index.ts'],
  inlineOnly: [],
});
