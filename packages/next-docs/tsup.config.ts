import { defineConfig } from 'tsup'
import tsconfig from './tsconfig.json'

const shared = {
  external: [
    '@algolia/client-search',
    'algoliasearch',
    'contentlayer',
    'unified'
  ],
  format: 'esm',
  dts: true,
  target: tsconfig.compilerOptions.target as 'es2016'
}

export default defineConfig([
  {
    ...shared,
    entry: [
      'src/{toc,link,breadcrumb,sidebar}.tsx',
      'src/{server,mdx-plugins,build-page-tree}.ts',
      'src/{search,search-algolia}/{client,shared}.ts',
      'src/contentlayer/{index,configuration}.ts'
    ]
  },
  {
    ...shared,
    entry: ['src/{search,search-algolia}/server.ts', 'src/middleware.ts'],
    format: 'cjs'
  }
])
