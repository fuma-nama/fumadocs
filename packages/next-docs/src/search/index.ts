import type { SortedResult } from '@/server/flexsearch-api'
import { useEffect, useState } from 'react'
import useSWR from 'swr'

export function useDocsSearch<Result = SortedResult[]>(
  locale?: string,
  tag?: string
) {
  const [search, setSearch] = useState('')
  const debouncedValue = useDebounce(search, 100)

  const searchQuery = useSWR(
    ['/api/search', debouncedValue, locale, tag],
    async ([url, query, locale, tag]) => {
      if (query.length === 0) return 'empty'

      const params = new URLSearchParams()
      params.set('query', query)
      if (locale) params.set('locale', locale)
      if (tag) params.set('tag', tag)

      const res = await fetch(`${url}?${params}`)

      if (!res.ok) throw new Error(await res.text())
      return (await res.json()) as Result
    },
    {
      keepPreviousData: true
    }
  )

  return { search, setSearch, query: searchQuery }
}

function useDebounce<T>(value: T, delayMs: number = 1000) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delayMs)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delayMs])

  return debouncedValue
}
