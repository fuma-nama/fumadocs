import tsconfig from './tsconfig.json'
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['./src/{config,map,types,loader,loader-mdx}.ts'],
  format: 'esm',
  external: ['next-docs-zeta', 'webpack'],
  dts: true,
  target: tsconfig.compilerOptions.target as 'es2016'
})
