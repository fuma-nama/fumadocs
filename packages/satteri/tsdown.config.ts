import { defineConfig } from 'tsdown';

export default defineConfig({
  dts: {
    sourcemap: false,
  },
  fixedExtension: false,
  target: 'es2023',
  format: 'esm',
  entry: ['src/index.ts', 'src/preset.ts', 'src/compile.ts', 'src/data-map.ts'],
  deps: {
    onlyBundle: [],
    neverBundle: ['fumadocs-core', 'fumadocs-typescript', 'satteri', 'unified', 'vfile', 'mdast-util-mdx', /^@types\//],
  },
});
