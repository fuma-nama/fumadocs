import { defineConfig } from 'tsup'
import tsconfig from './tsconfig.json'

export default defineConfig({
  entry: [
    'src/{server,breadcrumb,sidebar,toc,link,contentlayer,middleware,mdx-plugins}/index.{ts,tsx}',
    'src/search/{client,server,shared}.ts',
    'src/search-algolia/{client,server,shared}.ts',
    'src/contentlayer/configuration.ts'
  ],
  external: ['@algolia/client-search', 'algoliasearch', 'contentlayer', 'next'],
  format: 'esm',
  dts: true,
  target: tsconfig.compilerOptions.target as 'es2016'
})
