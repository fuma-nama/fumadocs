import { defineConfig } from 'tsdown';

export default defineConfig({
  format: 'esm',
  target: 'es2023',
  entry: ['./src/index.{ts,tsx}', './src/ui/story.tsx', './src/type-tree/index.ts'],
  fixedExtension: false,
  dts: {
    sourcemap: false,
  },
});
