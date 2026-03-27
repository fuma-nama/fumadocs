import { defineConfig } from 'tsdown';
import { compileInline } from './scripts/compile-inline.utils';

export default defineConfig({
  format: 'esm',
  target: 'es2023',
  entry: [
    './src/{index,i18n}.ts',
    './src/ui/index.tsx',
    './src/ui/base.tsx',
    './src/ui/create-client.tsx',
    './src/ui/client/index.tsx',
    './src/playground/{index,client}.tsx',
    './src/scalar/index.tsx',
    './src/server/index.ts',
    './src/requests/generators/*.ts',
  ],
  fixedExtension: false,
  unbundle: true,
  dts: true,
  async onSuccess() {
    await compileInline();
  },
  deps: {
    onlyBundle: [],
  },
  exports: {
    enabled: true,
    customExports(v) {
      v['./css/*'] = './css/*';
      return v;
    },
    legacy: true,
  },
});
