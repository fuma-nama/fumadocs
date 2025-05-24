import { defineConfig } from 'tsup';

export default defineConfig({
  external: [
    'algoliasearch',
    'unified',
    'next',
    'react',
    'react-dom',
    '@tanstack/react-router',
    'react-router',
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
    'src/search/orama-cloud.ts',
    'src/utils/use-on-change.ts',
    'src/utils/use-effect-event.ts',
    'src/utils/use-media-query.ts',
    'src/i18n/index.ts',
    'src/highlight/index.ts',
    'src/highlight/client.tsx',
    'src/framework/*',
  ],
});
