import { defineConfig } from 'tsup';

export default defineConfig({
  external: [
    '@algolia/client-search',
    'algoliasearch',
    'unified',
    'next',
    'react',
    'react-dom',
  ],
  dts: true,
  target: 'es2022',
  format: 'esm',
  entry: [
    'src/{toc,link,breadcrumb,sidebar,dynamic-link}.tsx',
    'src/{server,source,mdx-plugins}/index.ts',
    'src/search/client.ts',
    'src/search/server.ts',
    'src/search/algolia.ts',
    'src/utils/use-on-change.ts',
    'src/i18n/index.ts',
  ],
});
