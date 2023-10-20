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
import remarkMdxExport from './mdx-plugins/remark-exports'
import remarkMdxFrontmatter from './mdx-plugins/remark-frontmatter'

const PLUGIN_NAME = 'NextDocsWebpackPlugin'
let firstLoad = true

type NextDocsMDXOptions = NextMDXOptions & {
  /**
   * Properties to export from `vfile.data`
   */
  dataExports?: string[]
}

const createNextDocs =
  (pluginOptions: NextDocsMDXOptions = {}) =>
  (nextConfig: NextConfig = {}) => {
    const dataExports = [
      'structuredData',
      'toc',
      ...(pluginOptions.dataExports ?? [])
    ]

    const withMDX = createNextMDX({
      ...pluginOptions,
      options: {
        ...pluginOptions.options,
        remarkPlugins: [
          remarkGfm,
          [remarkFrontmatter, 'yaml' satisfies RemarkFrontmatterOptions],
          remarkMdxFrontmatter,
          remarkStructure,
          remarkToc,
          [remarkMdxExport, { values: dataExports }],
          ...(pluginOptions.options?.remarkPlugins ?? [])
        ],
        rehypePlugins: [
          rehypeNextDocs,
          ...(pluginOptions.options?.rehypePlugins ?? [])
        ]
      }
    })

    nextConfig = withMDX(nextConfig)

    return Object.assign({}, nextConfig, {
      webpack: (config, options) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        config.plugins.push((compiler: any) => {
          compiler.hooks.initialize.tap(PLUGIN_NAME, () => {
            if (firstLoad) {
              chokidar.watch('./content').on('all', () => {
                buildMap()
              })

              firstLoad = false
            }
          })
        })

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
