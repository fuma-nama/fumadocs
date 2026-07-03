import { defineConfig } from 'tsdown';

const entries = [
  'src/preset.ts',
  'src/compile.ts',
  'src/data-map.ts',
  'src/inject-exports.ts',
  'src/utils.ts',
  'src/remark-heading.ts',
  'src/remark-structure.ts',
  'src/remark-image.ts',
  'src/remark-code-tab.ts',
  'src/remark-npm.ts',
  'src/remark-ts2js.ts',
  'src/remark-auto-type-table.ts',
  'src/remark-block-id.ts',
  'src/remark-admonition.ts',
  'src/remark-directive-admonition.ts',
  'src/remark-steps.ts',
  'src/remark-mdx-mermaid.ts',
  'src/remark-feedback-block.ts',
  'src/rehype-toc.ts',
  'src/rehype-code.ts',
  'src/remark-llms.ts',
];

export default defineConfig({
  dts: {
    sourcemap: false,
  },
  fixedExtension: false,
  target: 'es2023',
  format: 'esm',
  entry: entries,
  deps: {
    onlyBundle: [],
    neverBundle: [
      'fumadocs-core',
      'fumadocs-typescript',
      'satteri',
      'unified',
      'vfile',
      'mdast-util-mdx',
      /^@types\//,
    ],
  },
});
