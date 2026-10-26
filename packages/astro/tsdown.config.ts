import { defineConfig } from 'tsdown';

export default defineConfig({
  dts: {
    sourcemap: false,
  },
  fixedExtension: false,
  target: 'es2023',
  format: 'esm',
  entry: ['src/index.ts', 'src/island.tsx', 'src/loaders.ts', 'src/source.ts', 'src/navigation.ts'],
  // injected by the integration
  exports: { enabled: true, exclude: ['./navigation'] },
  deps: {
    onlyBundle: [],
    neverBundle: [/^astro:/, /^virtual:/],
  },
});
