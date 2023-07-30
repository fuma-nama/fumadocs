import clsx from 'clsx'
import { CheckIcon, CopyIcon } from 'lucide-react'
import type { ComponentProps } from 'react'
import { useEffect, useRef, useState } from 'react'

export function Pre({ title, ...props }: ComponentProps<'pre'>) {
  const ref = useRef<HTMLPreElement>(null)
  const onCopy = () => {
    if (ref.current == null || ref.current.textContent == null) return

    navigator.clipboard.writeText(ref.current.textContent)
  }

  return (
    <div
      className="nd-relative nd-border nd-rounded-lg nd-not-prose"
      data-rehype-pretty-code-fragment
    >
      {title && (
        <div className="nd-text-sm nd-text-muted-foreground nd-bg-muted nd-pl-4 nd-pr-12 nd-py-2 nd-border-b">
          {title}
        </div>
      )}
      <CopyButton onCopy={onCopy} />
      <pre
        {...props}
        className={clsx(
          'nd-overflow-auto nd-bg-secondary/50 nd-text-sm',
          props.className
        )}
        ref={ref}
      >
        {props.children}
      </pre>
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
      className="nd-absolute nd-top-1 nd-right-1 nd-p-2 nd-border nd-bg-secondary nd-text-secondary-foreground nd-transition-colors nd-rounded-md hover:nd-bg-accent"
      aria-label="Copy Text"
      onClick={onClick}
    >
      {checked ? (
        <CheckIcon className="nd-w-3 nd-h-3" />
      ) : (
        <CopyIcon className="nd-w-3 nd-h-3" />
      )}
    </button>
  )
}
