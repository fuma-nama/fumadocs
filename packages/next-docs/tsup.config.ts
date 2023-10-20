import { defineConfig } from 'tsup'
import packageJson from './package.json'
import tsconfig from './tsconfig.json'

export default defineConfig({
  entry: [
    'src/{toc,link,breadcrumb,sidebar}.tsx',
    'src/{middleware,server,mdx-plugins}.ts',
    'src/{search,search-algolia}/{client,server,shared}.ts',
    'src/contentlayer/{index,configuration}.ts'
  ],
  external: [...Object.keys(packageJson.devDependencies)],
  format: 'esm',
  dts: true,
  target: tsconfig.compilerOptions.target as 'es2016'
})
