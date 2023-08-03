'use client'

import { CheckIcon, CopyIcon } from 'lucide-react'
import type { ComponentProps } from 'react'
import { useEffect, useRef, useState } from 'react'
import { ScrollArea } from './ui/scroll-area'

export function Pre({ title, ...props }: ComponentProps<'pre'>) {
  const ref = useRef<HTMLPreElement>(null)
  const onCopy = () => {
    if (ref.current == null || ref.current.textContent == null) return

    navigator.clipboard.writeText(ref.current.textContent)
  }

  return (
    <div
      className="relative border rounded-lg bg-secondary/50 text-sm nd-not-prose"
      data-rehype-pretty-code-fragment
    >
      {title && (
        <div className="text-sm text-muted-foreground bg-muted pl-4 pr-12 py-2 border-b z-[2]">
          {title}
        </div>
      )}
      <CopyButton onCopy={onCopy} />
      <ScrollArea>
        <pre {...props} ref={ref} className="max-h-[400px]">
          {props.children}
        </pre>
      </ScrollArea>
    </div>
  )
}

function CopyButton({ onCopy }: { onCopy: () => void }) {
  const [checked, setChecked] = useState(false)

  const onClick = () => {
    onCopy()
    setChecked(true)
  }

  useEffect(() => {
    if (!checked) return

    const timer = setTimeout(() => {
      setChecked(false)
    }, 1500)

    return () => {
      clearTimeout(timer)
    }
  }, [checked])

  return (
    <button
      className="absolute top-1 right-1 p-2 border bg-secondary text-secondary-foreground transition-colors rounded-md z-[2] hover:bg-accent"
      aria-label="Copy Text"
      onClick={onClick}
    >
      {checked ? (
        <CheckIcon className="w-3 h-3" />
      ) : (
        <CopyIcon className="w-3 h-3" />
      )}
    </button>
  )
}
