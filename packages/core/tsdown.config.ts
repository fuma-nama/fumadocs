import { defineConfig } from 'tsdown';

export default defineConfig({
  dts: {
    sourcemap: false,
  },
  fixedExtension: false,
  target: 'es2023',
  format: 'esm',
  entry: [
    'src/{toc,link,breadcrumb,dynamic-link}.tsx',
    'src/page-tree/index.ts',
    'src/{negotiation,content}/*',
    'src/content/mdx/preset-*.ts',
    'src/source/{index,schema}.ts',
    'src/source/client/*.{ts,tsx}',
    'src/source/plugins/{lucide-icons,slugs,status-badges}.{ts,tsx}',
    'src/search/{index,client,server,algolia,orama-cloud,orama-cloud-legacy}.ts',
    'src/utils/use-on-change.ts',
    'src/utils/use-effect-event.ts',
    'src/utils/use-media-query.ts',
    'src/i18n/*.ts',
    'src/highlight/index.ts',
    'src/highlight/client.tsx',
    'src/mdx-plugins/{index,codeblock-utils}.ts',
    'src/mdx-plugins/remark-*.ts',
    'src/mdx-plugins/rehype-*.ts',
    'src/framework/*',
  ],
});
