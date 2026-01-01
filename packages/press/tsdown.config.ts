import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['./src/**/*.ts'],
  unbundle: true,
  format: 'esm',
  target: 'node22',
  dts: true,
  external: ['virtual:app/routes'],
});
