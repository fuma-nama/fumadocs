import path from 'path'
import createNextMDX, { type NextMDXOptions } from '@next/mdx'
import type { NextConfig } from 'next'
import {
  rehypeNextDocs,
  remarkGfm,
  remarkStructure,
  remarkToc,
  type RehypeNextDocsOptions
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

type MDXOptions = Omit<
  NonNullable<NextMDXOptions['options']>,
  'rehypePlugins' | 'remarkPlugins'
> & {
  rehypePlugins?: ResolvePlugins
  remarkPlugins?: ResolvePlugins

  /**
   * Properties to export from `vfile.data`
   */
  valueToExport?: string[]

  /**
   * built-in `next-docs-zeta` rehype plugin options
   */
  rehypeNextDocsOptions?: RehypeNextDocsOptions
}

type ResolvePlugins = PluggableList | ((v: PluggableList) => PluggableList)

type NextDocsMDXOptions = {
  cwd?: string

  mdxOptions?: MDXOptions

  /**
   * Custom MDX loader
   */
  loader?: Loader

  /**
   * Where the root `_map.ts` should be, relative to cwd
   *
   * @default './_map.ts'
   */
  rootMapPath?: string

  /**
   * Where the content directory should be, relative to cwd
   *
   * @default './content'
   */
  rootContentPath?: string
}

function pluginOption(
  def: (v: PluggableList) => PluggableList,
  options: ResolvePlugins = []
): PluggableList {
  const list = def(Array.isArray(options) ? options : [])

  if (typeof options === 'function') {
    return options(list)
  }

  return list
}

const createNextDocs =
  ({
    loader = options => createNextMDX(options),
    mdxOptions = {},
    cwd = process.cwd(),
    rootMapPath = './_map.ts',
    rootContentPath = './content'
  }: NextDocsMDXOptions = {}) =>
  (nextConfig: NextConfig = {}) => {
    const valueToExport = [
      'structuredData',
      'toc',
      ...(mdxOptions.valueToExport ?? [])
    ]
    const _mapPath = path.resolve(cwd, rootMapPath)

    const remarkPlugins = pluginOption(
      v => [
        remarkGfm,
        [remarkFrontmatter, 'yaml' satisfies RemarkFrontmatterOptions],
        remarkMdxFrontmatter,
        remarkStructure,
        remarkToc,
        ...v,
        [remarkMdxExport, { values: valueToExport }]
      ],
      mdxOptions.remarkPlugins
    )

    const rehypePlugins: PluggableList = pluginOption(
      v => [[rehypeNextDocs, mdxOptions.rehypeNextDocsOptions], ...v],
      mdxOptions.rehypePlugins
    )

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
