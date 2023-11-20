'use client'

import type { TabsContentProps } from '@radix-ui/react-tabs'
import { useLayoutEffect, useMemo, useState, type ReactNode } from 'react'
import * as Primitive from './ui/tabs'

export * as Primitive from './ui/tabs'

type ListenerObject = () => void
const valueMap = new Map<string, string>()
const listeners: Map<string, ListenerObject[]> = new Map()

function add(id: string, listener: ListenerObject) {
  if (listeners.has(id)) {
    listeners.get(id)!.push(listener)
  } else {
    listeners.set(id, [listener])
  }
}

function remove(id: string, listener: ListenerObject) {
  listeners.set(id, listeners.get(id)?.filter(ltem => listener !== ltem) ?? [])
}

function update(id: string, v: string) {
  valueMap.set(id, v)
  listeners.get(id)?.forEach(item => item())
}

export function Tabs({
  id,
  items = [],
  persist = false,
  defaultIndex = 0,
  children
}: {
  /**
   * Identifier for Sharing value of tabs
   */
  id?: string
  /**
   * Enable persistent
   */
  persist?: boolean
  /**
   * @default 0
   */
  defaultIndex?: number

  items?: string[]
  children: ReactNode
}) {
  const values = useMemo(() => items.map(item => toValue(item)), [items])
  const [value, setValue] = useState(values[defaultIndex])

  useLayoutEffect(() => {
    if (!id) return

    if (persist) {
      const previous = localStorage.getItem(id)

      if (previous) update(id, previous)
    }

    const onUpdate = () => {
      const current = valueMap.get(id)
      // Only if item exists
      if (current != null && values.includes(current)) setValue(current)
    }

    onUpdate()
    add(id, onUpdate)
    return () => remove(id, onUpdate)
  }, [])

  const onValueChange = (value: string) => {
    setValue(value)

    if (id) {
      update(id, value)

      if (persist) localStorage.setItem(id, value)
    }
  }

  return (
    <Primitive.Tabs value={value} onValueChange={onValueChange}>
      <Primitive.TabsList>
        {values.map((v, i) => (
          <Primitive.TabsTrigger key={v} value={v}>
            {items[i]}
          </Primitive.TabsTrigger>
        ))}
      </Primitive.TabsList>
      {children}
    </Primitive.Tabs>
  )
}

function toValue(v: string) {
  return v.toLowerCase().replace(/\s/, '-')
}

export function Tab(props: TabsContentProps) {
  return <Primitive.TabsContent {...props} value={toValue(props.value)} />
}
