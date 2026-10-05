import { defineConfig } from 'tsdown';
import { packageTranslationsPlugin } from '../shared/compile-package-translations.ts';

export default defineConfig({
  format: 'esm',
  target: 'es2023',
  entry: ['./src/index.ts', './src/i18n.ts'],
  unbundle: true,
  ignoreWatch: ['src/.translations/**'],
  dts: {
    sourcemap: false,
  },
  platform: 'browser',
  plugins: [packageTranslationsPlugin()],
  exports: {
    customExports: {
      './css/*': './css/*',
    },
  },
});
