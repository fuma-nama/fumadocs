import { defineConfig } from 'tsup';

export default defineConfig({
  external: [
    // https://github.com/fuma-nama/fumadocs/issues/2144
    '@tanstack/react-router',
    'waku',
  ],
  dts: true,
  target: 'es2022',
  format: 'esm',
  entry: [
    'src/{toc,link,breadcrumb,dynamic-link,hide-if-empty}.tsx',
    'src/{source,page-tree}/index.ts',
    'src/{negotiation,content}/*',
    'src/source/plugins/lucide-icons.ts',
    'src/search/{index,client,server,algolia,orama-cloud}.ts',
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
