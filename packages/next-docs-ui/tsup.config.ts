import { defineConfig } from 'tsup'
import tsconfig from './tsconfig.json'

export default defineConfig({
  entry: [
    './src/components/{type-table,roll-button,image-zoom,files,tabs,accordion,steps,search,inline-toc,callout}.{ts,tsx}',
    './src/components/dialog/{search,search-default,search-algolia}.tsx',
    './src/*.{ts,tsx}'
  ],
  external: ['next-docs-zeta'],
  format: 'esm',
  dts: true,
  target: tsconfig.compilerOptions.target as 'es2016'
})
