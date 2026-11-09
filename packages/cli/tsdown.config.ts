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
    onlyBundle: ['fuma-cli', '@fuma-cli/interactive', '@babel/parser', '@babel/types'],
  },
  exports: {
    enabled: true,
    exclude: ['./index'],
  },
});
