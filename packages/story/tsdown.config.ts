import { defineConfig } from 'tsdown';
import { packageTranslationsPlugin } from '../shared/compile-package-translations.ts';

export default defineConfig({
  format: 'esm',
  target: 'es2023',
  entry: [
    './src/index.{ts,tsx}',
    './src/i18n.ts',
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
      v['./css/*'] = './css/*';
      return v;
    },
  },
  deps: {
    onlyBundle: ['@fastify/deepmerge', '@ungap/structured-clone', 'react-error-boundary'],
    neverBundle: [/^node:/],
  },
});
