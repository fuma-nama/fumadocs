import type { SearchDocsResult } from '@/server/types'
import { useEffect, useState } from 'react'
import useSWR from 'swr'

export function useDocsSearch<Result = SearchDocsResult>(locale?: string) {
  const [search, setSearch] = useState('')
  const debouncedValue = useDebounce(search, 100)

  const searchQuery = useSWR(
    ['docs', debouncedValue, locale],
    async key => {
      if (debouncedValue.length === 0) return 'empty'

      const params = new URLSearchParams()
      params.set('query', key[1])
      if (key[2]) params.set('locale', key[2])

      const res = await fetch(`/api/search?${params}`)

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
