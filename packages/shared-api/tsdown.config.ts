import { defineConfig } from 'tsdown';
import { packageTranslationsPlugin } from '../shared/compile-package-translations.ts';

export default defineConfig({
  format: 'esm',
  target: 'es2023',
  entry: [
    './src/{codegen,i18n}.ts',
    './src/{components,auto-anchor}/**/*',
    // exported from `components/schema`
    '!./src/components/schema/client.tsx',
    './src/utils/{id-to-title,is-plain-object,url,use-query,use-server-store}.ts',
  ],
  unbundle: true,
  ignoreWatch: ['src/.translations/**'],
  dts: {
    sourcemap: false,
  },
  sourcemap: false,
  plugins: [
    packageTranslationsPlugin({
      // `generateSchemaUI` moved to `@fumadocs/json-schema`, its labels are still our keys
      input: ['src/**/*.ts', 'src/**/*.tsx', '../json-schema/src/react.ts'],
    }),
  ],
  platform: 'browser',
  deps: {
    onlyBundle: ['@fastify/deepmerge'],
    neverBundle: [/^node:/, 'fs'],
  },
  exports: true,
});
