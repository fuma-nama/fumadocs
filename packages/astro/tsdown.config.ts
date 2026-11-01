import { defineConfig } from 'tsdown';

export default defineConfig({
  dts: {
    sourcemap: false,
  },
  fixedExtension: false,
  target: 'es2023',
  format: 'esm',
  entry: [
    'src/index.ts',
    'src/island.tsx',
    'src/loaders.ts',
    'src/source.ts',
    'src/config.ts',
    'src/app.ts',
    'src/navigation.ts',
    'src/ui/*.{ts,tsx}',
    'src/plugins/*.ts',
    'src/routes/*.ts',
  ],
  // `.astro` files are compiled by Astro
  copy: [
    { from: 'src/routes/*.astro', to: 'dist/routes' },
    { from: 'src/ui/*.astro', to: 'dist/ui' },
    { from: 'src/components/*.astro', to: 'dist/components' },
  ],
  // imported by the generated code and `.astro` files
  exports: {
    enabled: true,
    exclude: ['./island', './navigation', './app', /^(\.\/)?routes\//, /^(\.\/)?ui\//],
    customExports: {
      './components/*': './dist/components/*',
    },
  },
  deps: {
    onlyBundle: [],
    neverBundle: [/^astro:/, /^virtual:/, /\.astro$/],
  },
});
