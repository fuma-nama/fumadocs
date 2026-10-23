import { defineConfig } from 'tsdown';
import { workspaceTsgo } from '../shared/tsgo.ts';

export default defineConfig({
  fixedExtension: false,
  target: 'es2023',
  format: 'esm',
  entry: ['src/index.ts', 'src/cache-fs.ts', 'src/ui/index.ts'],
  dts: {
    sourcemap: false,
    ...workspaceTsgo(),
  },
  deps: {
    onlyBundle: [],
  },
});
