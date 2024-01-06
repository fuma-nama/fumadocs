import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['./src/index.ts', './src/create-app.ts'],
  format: 'esm',
  target: 'node18',
});
