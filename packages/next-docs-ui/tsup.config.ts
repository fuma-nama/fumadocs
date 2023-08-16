import { defineConfig } from 'tsup'
import tsconfig from './tsconfig.json'

export default defineConfig({
  entry: [
    './src/components/{type-table,roll-button,tabs,steps,index}.{ts,tsx}',
    './src/components/dialog/search.tsx',
    './src/*.{ts,tsx}'
  ],
  external: ['next-docs-zeta', 'shiki'],
  format: 'esm',
  dts: true,
  target: tsconfig.compilerOptions.target as 'es2016'
})
