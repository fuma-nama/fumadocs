import { defineConfig } from 'tsup'
import tsconfig from './tsconfig.json'

export default defineConfig({
  entry: ['./src/{config,map,types,loader,loader-mdx}.ts'],
  format: 'esm',
  external: ['next-docs-zeta', 'webpack'],
  dts: true,
  target: tsconfig.compilerOptions.target as 'es2016'
})
