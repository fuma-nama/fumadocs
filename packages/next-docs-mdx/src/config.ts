import fs from 'fs'
import path from 'path'
import createNextMDX, { type NextMDXOptions } from '@next/mdx'
import chokidar from 'chokidar'
import fg from 'fast-glob'
import type { NextConfig } from 'next'
import {
  rehypeNextDocs,
  remarkGfm,
  remarkStructure,
  remarkToc
} from 'next-docs-zeta/mdx-plugins'
import remarkFrontmatter, {
  type Options as RemarkFrontmatterOptions
} from 'remark-frontmatter'
import type { PluggableList } from 'unified'
import type { Compiler } from 'webpack'
import remarkMdxExport from './mdx-plugins/remark-exports'
import remarkMdxFrontmatter from './mdx-plugins/remark-frontmatter'

const PLUGIN_NAME = 'NextDocsWebpackPlugin'
let firstLoad = true

type WithMDX = (config: NextConfig) => NextConfig
type Loader = (options: NextMDXOptions) => WithMDX

type NextDocsMDXOptions = NextMDXOptions & {
  /**
   * Custom MDX loader
   */
  loader?: Loader

  /**
   * Properties to export from `vfile.data`
   */
  dataExports?: string[]
}

function Plugin(compiler: Compiler) {
  compiler.hooks.beforeCompile.tap(PLUGIN_NAME, () => {
    if (firstLoad) {
      chokidar.watch('./content').on('all', () => {
        buildMap()
      })

      firstLoad = false
    }
  })
}

const createNextDocs =
  ({
    loader = options => createNextMDX(options),
    dataExports = [],
    extension,
    options = {}
  }: NextDocsMDXOptions = {}) =>
  (nextConfig: NextConfig = {}) => {
    const exports = ['structuredData', 'toc', ...dataExports]

    const remarkPlugins: PluggableList = [
      remarkGfm,
      [remarkFrontmatter, 'yaml' satisfies RemarkFrontmatterOptions],
      remarkMdxFrontmatter,
      remarkStructure,
      remarkToc,
      [remarkMdxExport, { values: exports }],
      ...(options.remarkPlugins ?? [])
    ]

    const rehypePlugins: PluggableList = [
      rehypeNextDocs,
      ...(options.rehypePlugins ?? [])
    ]

    const withMDX = loader({
      extension,
      options: {
        ...options,
        remarkPlugins,
        rehypePlugins
      }
    })

    nextConfig = withMDX(nextConfig)

    return Object.assign({}, nextConfig, {
      webpack: (config, options) => {
        config.plugins.push(Plugin)

        if (typeof nextConfig.webpack === 'function') {
          return nextConfig.webpack(config, options)
        }

        return config
      }
    } satisfies NextConfig)
  }

function buildMap() {
  const prefix = './content'
  const cwd = process.cwd()
  const _map = path.join(cwd, './_map.ts')
  const files = fg.sync(`${prefix}/**/*.{md,mdx,json}`, { cwd })

  const entries = files.map(file => {
    return `"${file}": await import("${file}")`
  })

  const code = `
/** Generated automatically */

export const map = {
    ${entries.join(',')}
}
`
  const exists = fs.existsSync(_map)

  if (!exists || fs.readFileSync(_map).toString() !== code) {
    fs.writeFileSync(_map, code)

    console.log('Generated Page Map')
  }
}

export { createNextDocs as default }
