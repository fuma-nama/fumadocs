import { defineConfig } from 'tsdown';

export default defineConfig({
  format: 'esm',
  target: 'es2023',
  entry: [
    './src/index.ts',
    './src/ui/index.ts',
    './src/ui/base.tsx',
    './src/ui/client/index.tsx',
    './src/playground/{index,client}.tsx',
    './src/scalar/index.tsx',
    './src/server/index.ts',
  ],
  fixedExtension: false,
  unbundle: true,
  dts: {
    sourcemap: false,
  },
  external: [/json-schema-typed/, 'openapi-types'],
});
