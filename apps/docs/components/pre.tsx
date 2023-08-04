'use client'

import { cn } from '@/utils/cn'
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
      className="relative group border rounded-lg bg-secondary/50 text-sm nd-not-prose"
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
      className={cn(
        'absolute top-2 right-2 p-2 bg-secondary rounded-md transition-all text-secondary-foreground z-[2] opacity-0 group-hover:opacity-100',
        checked && 'opacity-100'
      )}
      aria-label="Copy Text"
      onClick={onClick}
    >
      <CheckIcon
        className={cn(
          'absolute w-3.5 h-3.5 transition-transform',
          !checked && 'scale-0 rotate-90'
        )}
      />

      <CopyIcon
        className={cn(
          'w-3.5 h-3.5 transition-transform',
          checked && 'scale-0 rotate-90'
        )}
      />
    </button>
  )
}
