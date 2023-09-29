'use client'

import { cn } from '@/utils/cn'
import algo from 'algoliasearch/lite'
import { cva } from 'class-variance-authority'
import {
  InternalDialog,
  type SearchDialogProps
} from 'next-docs-ui/components/dialog/search'
import type { BaseIndex } from 'next-docs-zeta/algolia'
import type { SortedResult } from 'next-docs-zeta/server'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import useSWR from 'swr'

const itemVariants = cva(
  'border px-2 py-0.5 rounded-md text-xs text-muted-foreground font-medium transition-colors',
  {
    variants: {
      active: {
        true: 'text-accent-foreground bg-accent'
      }
    }
  }
)
const client = algo(
  process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!,
  process.env.NEXT_PUBLIC_ALGOLIA_API_KEY!
)
const index = client.initIndex('document')

async function searchDocs(query: string, tag: string) {
  if (query.length === 0) return 'empty'
  const result = await index.search<BaseIndex>(query, {
    filters: `tag:${tag}`,
    distinct: 3,
    hitsPerPage: 8
  })
  const grouped: SortedResult[] = []

  let last_url: string | null = null

  for (const hit of result.hits) {
    if (last_url !== hit.url) {
      last_url = hit.url

      grouped.push({
        id: hit.url,
        type: 'page',
        url: hit.url,
        content: hit.title
      })
    }

    grouped.push({
      id: hit.objectID,
      type: hit.content === hit.section ? 'heading' : 'text',
      url: hit.url + '#' + hit.section_id,
      content: hit.content
    })
  }

  return grouped
}
export default function CustomSearchDialog(props: SearchDialogProps) {
  const { mode } = useParams()
  const defaultTag = mode === 'headless' ? 'headless' : 'ui'
  const [tag, setTag] = useState(defaultTag)
  const [search, setSearch] = useState('')
  const { data } = useSWR(
    ['search', search, tag],
    async ([, query, tag]) => searchDocs(query, tag),
    {
      keepPreviousData: true
    }
  )

  useEffect(() => {
    setTag(defaultTag)
  }, [defaultTag])

  return (
    <InternalDialog
      {...props}
      search={search}
      setSearch={setSearch}
      data={data}
    >
      <div className="flex flex-row items-center gap-1 p-4">
        <button
          className={cn(itemVariants({ active: tag === 'headless' }))}
          onClick={() => setTag('headless')}
          tabIndex={-1}
        >
          Headless
        </button>
        <button
          className={cn(itemVariants({ active: tag === 'ui' }))}
          onClick={() => setTag('ui')}
          tabIndex={-1}
        >
          UI
        </button>
        <a
          href="https://algolia.com"
          rel="noreferrer noopener"
          className="text-muted-foreground text-xs ml-auto"
        >
          Search powered by Algolia
        </a>
      </div>
    </InternalDialog>
  )
}
