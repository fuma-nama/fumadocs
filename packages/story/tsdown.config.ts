import { defineConfig } from 'tsdown';
import { packageTranslationsPlugin } from '../shared/compile-package-translations.ts';

export default defineConfig({
  format: 'esm',
  target: 'es2023',
  entry: [
    './src/index.{ts,tsx}',
    './src/{index.browser,i18n}.ts',
    './src/type-tree/{index,index.browser}.ts',
    './src/vite/*',
    './src/next/*',
    './src/webpack/story.ts',
  ],
  unbundle: true,
  ignoreWatch: ['src/.translations/**'],
  dts: {
    sourcemap: false,
  },
  platform: 'browser',
  plugins: [packageTranslationsPlugin()],
  exports: {
    customExports(v) {
      const { './index.browser': browser, './type-tree/index.browser': typeTree, ...rest } = v;

      return {
        ...rest,
        // the story factory and `collapse()` run the TypeScript compiler, client bundles get the stubs
        '.': { types: './dist/index.d.ts', browser, import: v['.'] },
        './type-tree': {
          types: './dist/type-tree/index.d.ts',
          browser: typeTree,
          import: v['./type-tree'],
        },
        './css/*': './css/*',
      };
    },
  },
  deps: {
    onlyBundle: ['@fastify/deepmerge', '@ungap/structured-clone', 'react-error-boundary'],
    neverBundle: [/^node:/],
  },
});
