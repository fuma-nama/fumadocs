import { defineConfig } from 'tsup';

export default defineConfig({
  external: ['server-only', '@maximai/fumadocs-ui', 'react'],
  dts: true,
  target: 'es6',
  format: 'esm',
  entry: ['src/index.ts', 'src/ui/index.ts'],
});
