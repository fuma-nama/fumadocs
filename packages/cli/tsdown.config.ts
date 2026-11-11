import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: [
    './src/{index,config}.ts',
    './src/registry/installer.ts',
    './src/{codemod,project}/index.ts',
    './src/features/*.ts',
    './src/features/docs/index.ts',
  ],
  format: 'esm',
  dts: { sourcemap: false },
  fixedExtension: false,
  target: 'node22',
  copy: 'schema.json',
  deps: {
    onlyBundle: [
      'fuma-cli',
      '@babel/parser',
      '@babel/types',
      'magic-string',
      '@jridgewell/sourcemap-codec',
      'package-manager-detector',
    ],
  },
  exports: {
    enabled: true,
    exclude: ['./index'],
  },
});
