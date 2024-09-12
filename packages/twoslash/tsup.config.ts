import * as fs from 'node:fs';
import { defineConfig } from 'tsup';

fs.mkdirSync('./dist');
fs.copyFileSync('./styles/twoslash.css', './dist/twoslash.css');

export default defineConfig({
  dts: true,
  target: 'es6',
  format: 'esm',
  entry: ['src/index.ts', 'src/ui/index.ts'],
});
