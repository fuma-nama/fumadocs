import { defineConfig } from 'tsdown';

export default defineConfig({
  dts: true,
  fixedExtension: false,
  target: 'node22',
  format: 'esm',
  entry: ['src/{index,configuration}.ts'],
});
