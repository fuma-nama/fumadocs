import { defineConfig } from 'tsup'
import tsconfig from './tsconfig.json'

export default defineConfig({
  external: [
    '@algolia/client-search',
    'algoliasearch',
    'contentlayer',
    'unified'
  ],
  dts: true,
  target: tsconfig.compilerOptions.target as 'es2016',
  format: 'esm',
  entry: [
    'src/{toc,link,breadcrumb,sidebar,dynamic-link}.tsx',
    'src/{server,mdx-plugins}.ts',
    'src/contentlayer/{index,configuration}.ts',
    'src/{search,search-algolia}/{client,server}.ts',
    'src/search/shared.ts',
    'src/middleware.ts'
  ],
  outExtension: () => ({ js: '.js' })
})
