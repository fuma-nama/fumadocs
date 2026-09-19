import { defineConfig } from 'tsdown';
import { packageTranslationsPlugin } from '../shared/compile-package-translations.ts';

export default defineConfig({
  format: 'esm',
  target: 'es2023',
  entry: [
    './src/index.{ts,tsx}',
    './src/{index.browser,i18n}.ts',
    './src/type-tree/index.ts',
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
      const { './index.browser': browser, ...rest } = v;

      return {
        ...rest,
        // the story factory runs the TypeScript compiler over your files, client bundles get the stub
        '.': { types: './dist/index.d.ts', browser, import: v['.'] },
        './css/*': './css/*',
      };
    },
  },
  deps: {
    onlyBundle: ['@fastify/deepmerge', '@ungap/structured-clone', 'react-error-boundary'],
    neverBundle: [/^node:/],
  },
});
