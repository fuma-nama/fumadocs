import { languages } from '@/app/i18n'
import { getPages } from '@/app/tree'
import { getPageUrl } from 'next-docs-zeta/contentlayer'
import { createI18nSearchAPI } from 'next-docs-zeta/server'

export const { GET } = createI18nSearchAPI('simple', {
  indexes: languages.map(lang => {
    const pages = getPages(lang)!.map(page => ({
      title: page.title,
      content: page.body.raw,
      url: getPageUrl(page.slug.split('/'), '/', lang)
    }))

    return [lang, pages]
  })
})
