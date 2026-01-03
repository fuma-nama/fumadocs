import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['./src/**/*.{ts,tsx}'],
  unbundle: true,
  format: 'esm',
  target: 'node22',
  dts: true,
  external: ['virtual:app/routes'],
});
