import { defineConfig } from 'tsdown';
import { compileInline } from './scripts/compile-inline.utils';

export default defineConfig({
  format: 'esm',
  target: 'es2023',
  entry: [
    './src/*.{ts,tsx}',
    './src/{components,contexts,provider,tailwind,og}/**/*.{ts,tsx}',
    './src/layouts/*/index.tsx',
    './src/layouts/*/page/index.tsx',
    './src/layouts/**/slots/*',
    './src/layouts/home/{navbar,not-found}.tsx',
    './src/utils/use-*.{ts,tsx}',
  ],
  fixedExtension: false,
  unbundle: true,
  dts: {
    sourcemap: false,
  },
  css: {
    inject: true,
  },
  async onSuccess() {
    await compileInline();
  },
  deps: {
    onlyBundle: [],
  },
  exports: {
    exclude: ['mdx.server', 'tailwind/typography'],
    customExports: {
      './style.css': './dist/style.css',
      './css/*': './css/*',
      './mdx': {
        types: './dist/mdx.d.ts',
        node: './dist/mdx.server.js',
        import: './dist/mdx.js',
      },
    },
  },
});
