import { defineConfig } from 'tsup';

export default defineConfig({
  dts: true,
  target: 'es2022',
  format: 'esm',
  entry: {
    'cli/index': 'src/cli/index.ts',
    vite: 'src/vite/index.ts',
  },
});
