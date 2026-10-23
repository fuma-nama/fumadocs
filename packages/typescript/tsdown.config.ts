import { defineConfig } from 'tsdown';
import { workspaceTsgo } from '../shared/tsgo.ts';

export default defineConfig({
  dts: {
    sourcemap: false,
    ...workspaceTsgo(),
  },
  fixedExtension: false,
  target: 'es2023',
  format: 'esm',
  entry: ['src/index.ts', 'src/ui/index.ts'],
  deps: {
    onlyBundle: [],
    neverBundle: ['server-only'],
  },
});
