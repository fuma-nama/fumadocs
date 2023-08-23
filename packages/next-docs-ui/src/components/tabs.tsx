'use client'

import type { TabsContentProps } from '@radix-ui/react-tabs'
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

  /**
   * @deprecated Use `defaultIndex` instead
   */
  defaultValue?: string
  items?: string[]
  children: ReactNode
}) {
  const [value, setValue] = useState<string>()
  const defaultValue = items[defaultIndex]

  useEffect(() => {
    if (!id) return

    if (persist) {
      const previous = localStorage.getItem(id)
      // Only if item exists
      if (previous && items.includes(previous)) setValue(previous)
    }
    const listener: ListenerObject = v => {
      if (items.includes(v)) setValue(v)
    }
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
      defaultValue={defaultValue ? toValue(defaultValue) : undefined}
      value={value}
      onValueChange={setValue}
    >
      <Primitive.TabsList>
        {items.map(item => (
          <Primitive.TabsTrigger key={item} value={toValue(item)}>
            {item}
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
