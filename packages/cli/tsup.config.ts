import { defineConfig } from 'tsup';
import { sync } from './scripts/sync';

console.log('[CLI] sync generated.js');
void sync();

export default defineConfig({
  entry: ['./src/index.ts'],
  format: 'esm',
  dts: true,
  target: 'node18',
});
