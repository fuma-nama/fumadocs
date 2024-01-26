import { defineConfig } from 'tsup';

const sharedConfig = {
  external: ['contentlayer', 'unified'],
};

export default defineConfig({
  ...sharedConfig,
  dts: true,
  target: 'es6',
  format: 'esm',
  entry: ['src/{index,configuration}.ts'],
});
