import { allPages, getPageUrl } from '@/app/source'
import { createSearchAPI, setResponse } from 'next-docs-zeta/search/server'
import { NextResponse } from 'next/server'

setResponse(NextResponse)

export const { GET } = createSearchAPI('advanced', {
  indexes: allPages.map(page => ({
    title: page.matter.title,
    structuredData: page.data.structuredData,
    id: page.file.id,
    url: getPageUrl(page.slugs)
  }))
})
