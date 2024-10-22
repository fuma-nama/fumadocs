import * as fs from 'node:fs/promises';
import { defineConfig } from 'tsup';

export default defineConfig({
  dts: true,
  target: 'es6',
  format: 'esm',
  async onSuccess() {
    await fs.copyFile('./styles/twoslash.css', './dist/twoslash.css');
  },
  entry: ['src/index.ts', 'src/ui/index.ts'],
});
