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
    'src/{toc,link,breadcrumb,sidebar,dynamic-link,hide-if-empty}.tsx',
    'src/{server,source,mdx-plugins,content}/index.ts',
    'src/http/{markdown,media-preference,index}.ts',
    'src/http/middleware/next.ts',
    'src/search/{index,client,server,algolia,orama-cloud}.ts',
    'src/utils/use-on-change.ts',
    'src/utils/use-effect-event.ts',
    'src/utils/use-media-query.ts',
    'src/i18n/*.ts',
    'src/highlight/index.ts',
    'src/highlight/client.tsx',
    'src/framework/*',
  ],
});
