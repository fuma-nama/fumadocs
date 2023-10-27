import path from 'path'
import createNextMDX, { type NextMDXOptions } from '@next/mdx'
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
import type { Configuration } from 'webpack'
import type { LoaderOptions } from './loader'
import remarkMdxExport from './mdx-plugins/remark-exports'
import remarkMdxFrontmatter from './mdx-plugins/remark-frontmatter'
import { NextDocsWebpackPlugin } from './webpack-plugins/next-docs'

type WithMDX = (config: NextConfig) => NextConfig
type Loader = (options: NextMDXOptions) => WithMDX

type NextDocsMDXOptions = {
  cwd?: string

  mdxOptions?: NextMDXOptions['options']

  /**
   * Custom MDX loader
   */
  loader?: Loader

  /**
   * Properties to export from `vfile.data`
   */
  dataExports?: string[]

  /**
   * Where the root `_map.ts` should be, relative to cwd
   *
   * @default './_map.ts`
   */
  rootMapPath?: string

  /**
   * Where the content directory should be, relative to cwd
   *
   * @default './content/docs`
   */
  rootContentPath?: string
}

const createNextDocs =
  ({
    loader = options => createNextMDX(options),
    dataExports = [],
    mdxOptions = {},
    cwd = process.cwd(),
    rootMapPath = './_map.ts',
    rootContentPath = './content/docs'
  }: NextDocsMDXOptions = {}) =>
  (nextConfig: NextConfig = {}) => {
    const exports = ['structuredData', 'toc', ...dataExports]
    const _mapPath = path.resolve(cwd, rootMapPath)

    const remarkPlugins: PluggableList = [
      remarkGfm,
      [remarkFrontmatter, 'yaml' satisfies RemarkFrontmatterOptions],
      remarkMdxFrontmatter,
      remarkStructure,
      remarkToc,
      ...(mdxOptions?.remarkPlugins ?? []),
      [remarkMdxExport, { values: exports }]
    ]

    const rehypePlugins: PluggableList = [
      rehypeNextDocs,
      ...(mdxOptions?.rehypePlugins ?? [])
    ]

    const withMDX = loader({
      extension: /\.mdx?$/,
      options: {
        ...mdxOptions,
        remarkPlugins,
        rehypePlugins
      }
    })

    nextConfig = withMDX(nextConfig)

    return Object.assign({}, nextConfig, {
      webpack: (config: Configuration, options) => {
        config.module!.rules!.push({
          test: _mapPath,
          use: {
            loader: 'next-docs-mdx/loader',
            options: {
              cwd,
              rootContentPath
            } satisfies LoaderOptions
          }
        })

        config.plugins!.push(
          new NextDocsWebpackPlugin({ rootMapFile: _mapPath })
        )

        return nextConfig.webpack?.(config, options) ?? config
      }
    } satisfies NextConfig)
  }

export { createNextDocs as default }
