'use client'

import { I18nContext } from './contexts/i18n'
import { useContext, useLayoutEffect, useState } from 'react'

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
    <p className="text-muted-foreground mt-8 text-xs">
      {lastUpdate} {date}
    </p>
  )
}
