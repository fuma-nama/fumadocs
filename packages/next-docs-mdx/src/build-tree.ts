import type {
  AbstractMeta,
  AbstractPage,
  Context
} from 'next-docs-zeta/build-page-tree'
import type { ReactElement } from 'react'
import type { Meta, Page } from './types'

export type ContextOptions = {
  /**
   * Get url from slugs and locale, override the default getUrl function
   */
  getUrl: (slugs: string[], locale?: string) => string

  resolveIcon?: (icon: string) => ReactElement | undefined
}

export function loadContext(
  metas: Meta[],
  pages: Page[],
  { getUrl, resolveIcon = () => undefined }: ContextOptions
): Context {
  const pageMap = new Map<string, AbstractPage>()
  const basePages: AbstractPage[] = []
  const metaMap = new Map<string, AbstractMeta>()

  for (const page of pages) {
    const abstractPage: AbstractPage = {
      file: page.file,
      title: page.matter.title,
      url: getUrl(page.slugs, page.file.locale),
      icon: page.matter.icon
    }

    if (!page.file.locale) basePages.push(abstractPage)
    pageMap.set(page.file.flattenedPath, abstractPage)
  }

  for (const meta of metas) {
    metaMap.set(meta.file.flattenedPath, {
      file: meta.file,
      pages: meta.data.pages,
      icon: meta.data.icon,
      title: meta.data.title
    })
  }

  return {
    resolveIcon,
    basePages,
    getMetaByPath(flattenPath) {
      return metaMap.get(flattenPath) ?? null
    },
    getPageByPath(flattenPath) {
      return pageMap.get(flattenPath) ?? null
    }
  }
}
