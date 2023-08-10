'use client'

import { useEffect, useState, type ReactNode } from 'react'
import * as Primitive from './ui/tabs'

export * as Primitive from './ui/tabs'

type ListenerObject = (v: string) => void
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

function fire(id: string, value: string) {
  listeners.get(id)?.forEach(item => item(value))
}

export function Tabs({
  id,
  items = [],
  persist = false,
  defaultValue,
  children
}: {
  /**
   * Identifier for Sharing value of tabs
   */
  id?: string
  /**
   * Enabled persistent
   */
  persist?: boolean
  defaultValue?: string
  items?: string[]
  children: ReactNode
}) {
  const [value, setValue] = useState<string>()

  useEffect(() => {
    if (!id) return

    if (persist) {
      const previous = localStorage.getItem(id)
      // Only if item exists
      if (previous && items.includes(previous)) setValue(previous)
    }
    const listener: ListenerObject = v => setValue(v)
    add(id, listener)

    return () => remove(id, listener)
  }, [])

  useEffect(() => {
    if (id && value) {
      fire(id, value)

      if (persist) localStorage.setItem(id, value)
    }
  }, [value])

  return (
    <Primitive.Tabs
      defaultValue={defaultValue}
      value={value}
      onValueChange={setValue}
    >
      <Primitive.TabsList>
        {items.map(item => (
          <Primitive.TabsTrigger key={item} value={item}>
            {item}
          </Primitive.TabsTrigger>
        ))}
      </Primitive.TabsList>
      {children}
    </Primitive.Tabs>
  )
}

export const Tab = Primitive.TabsContent
