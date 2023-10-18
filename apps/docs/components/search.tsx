'use client'

import { cn } from '@/utils/cn'
import algo from 'algoliasearch/lite'
import { cva } from 'class-variance-authority'
import {
  SearchDialog,
  type SharedProps
} from 'next-docs-ui/components/dialog/search'
import { useAlgoliaSearch } from 'next-docs-zeta/search-algolia/client'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'

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

export default function CustomSearchDialog(props: SharedProps) {
  const { mode } = useParams()
  const defaultTag = mode === 'headless' ? 'headless' : 'ui'
  const [tag, setTag] = useState(defaultTag)
  const { search, setSearch, query } = useAlgoliaSearch(index, {
    filters: `tag:${tag}`,
    distinct: 5,
    hitsPerPage: 10
  })

  useEffect(() => {
    setTag(defaultTag)
  }, [defaultTag])

  return (
    <SearchDialog
      {...props}
      search={search}
      onSearchChange={setSearch}
      data={query.data}
      footer={
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
      }
    />
  )
}
