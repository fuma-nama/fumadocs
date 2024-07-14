import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['./src/index.ts', './src/ui/index.ts'],
  format: 'esm',
  dts: true,
  target: 'es2022',
});
