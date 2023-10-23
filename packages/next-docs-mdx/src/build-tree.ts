import {
  createPageTreeBuilder,
  type PageTreeBuilder
} from 'next-docs-zeta/build-page-tree'
import type { ReactElement } from 'react'
import type { ResolvedFiles } from './resolve-files'

export type BuilderOptions = {
  /**
   * Get url from slugs and locale, override the default getUrl function
   */
  getUrl: (slugs: string[], locale?: string) => string

  resolveIcon?: (icon: string) => ReactElement | undefined
}

export function getPageTreeBuilder(
  { metas, pages }: ResolvedFiles,
  { getUrl, resolveIcon = () => undefined }: BuilderOptions
): PageTreeBuilder {
  return createPageTreeBuilder({
    metas: metas.map(meta => ({
      file: meta.file,
      pages: meta.data.pages,
      icon: meta.data.icon,
      title: meta.data.title
    })),
    pages: pages.map(page => ({
      file: page.file,
      title: page.matter.title,
      url: getUrl(page.slugs, page.file.locale),
      icon: page.matter.icon
    })),
    resolveIcon
  })
}
