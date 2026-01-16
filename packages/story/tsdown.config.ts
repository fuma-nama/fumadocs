import { defineConfig } from 'tsdown';

export default defineConfig({
  format: 'esm',
  target: 'es2023',
  entry: ['./src/index.{ts,tsx}'],
  fixedExtension: false,
  dts: true,
  unbundle: true,
});
