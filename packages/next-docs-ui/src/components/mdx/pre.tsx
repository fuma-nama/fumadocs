import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/utils/cn'
import { CheckIcon, CopyIcon } from 'lucide-react'
import type { ButtonHTMLAttributes, ComponentPropsWithoutRef } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

type PreProps = ComponentPropsWithoutRef<'pre'> & {
  allowCopy?: boolean
}

export function Pre({ title, allowCopy = true, ...props }: PreProps) {
  const ref = useRef<HTMLPreElement>(null)
  const onCopy = useCallback(() => {
    if (ref.current?.textContent == null) return

    navigator.clipboard.writeText(ref.current.textContent)
  }, [])

  return (
    <div className="nd-relative nd-overflow-hidden nd-group nd-border nd-rounded-lg nd-text-sm nd-bg-secondary/50 nd-not-prose">
      {title ? (
        <div className="nd-flex nd-flex-row nd-items-center nd-bg-muted nd-px-2 nd-py-1.5 nd-border-b">
          <span className="nd-pl-2 nd-flex-1 nd-text-muted-foreground">
            {title}
          </span>
          {allowCopy && <CopyButton onCopy={onCopy} />}
        </div>
      ) : (
        allowCopy && (
          <CopyButton
            className="nd-absolute nd-top-2 nd-right-2 nd-bg-secondary nd-text-secondary-foreground nd-z-[2]"
            onCopy={onCopy}
          />
        )
      )}
      <ScrollArea>
        <pre ref={ref} {...props} className={cn('nd-py-4', props.className)}>
          {props.children}
        </pre>
      </ScrollArea>
    </div>
  )
}

function CopyButton({
  className,
  onCopy,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  onCopy: () => void
}) {
  const [checked, setChecked] = useState(false)
  const timeoutRef = useRef<number | null>()

  const onClick = () => {
    if (timeoutRef.current != null) window.clearTimeout(timeoutRef.current)
    timeoutRef.current = window.setTimeout(() => setChecked(false), 1500)
    onCopy()
    setChecked(true)
  }

  // Avoid updates after being unmounted
  useEffect(() => {
    return () => {
      if (timeoutRef.current != null) window.clearTimeout(timeoutRef.current)
    }
  }, [])

  return (
    <button
      className={cn(
        'nd-inline-flex nd-p-2 nd-rounded-md nd-transition-opacity nd-opacity-0 group-hover:nd-opacity-100',
        className
      )}
      aria-label="Copy Text"
      onClick={onClick}
      {...props}
    >
      <CheckIcon
        className={cn(
          'nd-h-3.5 nd-w-3.5 nd-transition-transform',
          !checked && 'nd-scale-0'
        )}
      />
      <CopyIcon
        className={cn(
          'nd-absolute nd-h-3.5 nd-w-3.5 nd-transition-transform',
          checked && 'nd-scale-0'
        )}
      />
    </button>
  )
}
