import { defineConfig } from 'tsup'
import tsconfig from './tsconfig.json'

const shared = {
  external: [
    '@algolia/client-search',
    'algoliasearch',
    'contentlayer',
    'unified'
  ],
  dts: true,
  target: tsconfig.compilerOptions.target as 'es2016'
}

export default defineConfig([
  {
    ...shared,
    format: 'esm',
    name: 'next-docs-client',
    entry: [
      'src/{toc,link,breadcrumb,sidebar,dynamic-link}.tsx',
      'src/{search,search-algolia}/client.ts'
    ],
    outExtension: () => ({ js: '.js' })
  },
  {
    ...shared,
    format: 'esm',
    name: 'next-docs-esm',
    entry: [
      'src/{server,mdx-plugins}.ts',
      'src/contentlayer/{index,configuration}.ts'
    ]
  },
  {
    ...shared,
    name: 'next-docs-cjs',
    entry: [
      'src/{search,search-algolia}/server.ts',
      'src/search/shared.ts',
      'src/middleware.ts'
    ],
    format: 'cjs'
  }
])
