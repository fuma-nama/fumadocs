import type { MDXProps } from 'mdx/types'
import type { StructuredData } from 'next-docs-zeta/mdx-plugins'
import type { TableOfContents } from 'next-docs-zeta/server'

export type FileInfo = {
  locale?: string

  /**
   * File extension, starting with a dot, like `.json`
   */
  type: string

  /**
   * Directories of file
   */
  dirname: string

  /**
   * File name with extension
   */
  base: string

  /**
   * File name without extension
   */
  name: string

  /**
   * Original path, should be relative to cwd
   */
  path: string

  /**
   * A flatten path without extensions and prefixes, like `dir/file`
   */
  flattenedPath: string

  /**
   * Unique ID for each file, based on path
   */
  id: string
}

/**
 * Defalt MDX properties, feel free to extend
 */
export interface MDXExport {
  default(props: MDXProps): JSX.Element
  frontmatter: Frontmatter
  toc: TableOfContents
  structuredData: StructuredData
}

export interface Frontmatter {
  title: string
  description: string
  icon?: string
}

export interface JsonExport {
  title: string
  description: string
  pages: string[]
  icon?: string
}

export interface Meta {
  file: FileInfo
  data: JsonExport
}

export interface Page {
  file: FileInfo
  slugs: string[]
  data: MDXExport
  matter: MDXExport['frontmatter']
}
