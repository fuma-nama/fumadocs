import tsconfig from './tsconfig.json'
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['./src/index.ts'],
  format: 'cjs',
  target: tsconfig.compilerOptions.target as 'es2016'
})
