import { defineConfig } from 'tsup';

export default defineConfig({
  external: ['@algolia/client-search', 'algoliasearch', 'unified'],
  dts: true,
  target: 'es6',
  format: 'esm',
  entry: [
    'src/{toc,link,breadcrumb,sidebar,dynamic-link}.tsx',
    'src/{server,source,mdx-plugins}/index.ts',
    'src/{search,search-algolia}/client.ts',
    'src/search/shared.ts',
    'src/{search,search-algolia}/server.ts',
    'src/middleware.ts',
  ],
});
