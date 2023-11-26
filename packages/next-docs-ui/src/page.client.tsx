'use client'

import { useContext, useLayoutEffect, useState } from 'react'
import { I18nContext } from './contexts/i18n'

export * from '@/components/toc'
export * from '@/components/breadcrumb'

export function LastUpdate(props: { date: Date }) {
  const lastUpdate =
    useContext(I18nContext).text?.lastUpdate ?? 'Last updated on'
  const [date, setDate] = useState('')

  useLayoutEffect(() => {
    // to the timezone of client
    setDate(props.date.toLocaleDateString())
  }, [props.date])

  return (
    <p className="nd-text-muted-foreground nd-text-xs nd-mt-8">
      {lastUpdate} {date}
    </p>
  )
}
