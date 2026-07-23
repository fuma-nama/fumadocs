import { defineConfig } from 'tsdown';

export default defineConfig({
  fixedExtension: false,
  target: 'es2023',
  format: 'esm',
  dts: true,
  entry: ['src/{index,client}.ts', 'src/bin.ts', 'src/dev/{vite,ws}.ts', 'src/ui/index.tsx'],
  exports: {
    bin: {
      'fumadocs-obsidian': './src/bin.ts',
    },
    exclude: ['bin'],
  },
  deps: {
    onlyBundle: [],
  },
});
