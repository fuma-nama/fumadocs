import { defineConfig } from 'tsup'
import tsconfig from './tsconfig.json'

export default defineConfig({
  entry: [
    'src/{server,breadcrumb,sidebar,toc,search,link,contentlayer,middleware,mdx-plugins,algolia,search-algolia}/index.{ts,tsx}',
    'src/contentlayer/configuration.ts'
  ],
  external: [
    '@algolia/client-search',
    '@types/react',
    '@types/react-dom',
    'algoliasearch',
    'contentlayer',
    'next',
    'unified'
  ],
  format: 'esm',
  dts: true,
  target: tsconfig.compilerOptions.target as 'es2016'
})
