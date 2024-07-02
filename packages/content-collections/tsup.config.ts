import { defineConfig } from 'tsup';

export default defineConfig({
  dts: true,
  target: 'esnext',
  format: 'esm',
  entry: ['src/{index,configuration}.ts'],
});
