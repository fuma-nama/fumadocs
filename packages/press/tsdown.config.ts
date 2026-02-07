import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['./src/**/*.{ts,tsx}'],
  unbundle: true,
  format: 'esm',
  target: 'node22',
  dts: {
    sourcemap: false,
  },
  external: ['virtual:app/routes'],
  inlineOnly: [],
});
