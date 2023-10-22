import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/utils/cn'
import { CheckIcon, CopyIcon } from 'lucide-react'
import type { ButtonHTMLAttributes, ComponentPropsWithoutRef } from 'react'
import { useCallback, useRef, useState } from 'react'

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
    <div
      className="nd-relative nd-group nd-border nd-rounded-lg nd-overflow-hidden nd-text-sm nd-bg-secondary/50 nd-not-prose"
      data-code-fragment
    >
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
            className="nd-absolute nd-top-2 nd-right-2 nd-bg-secondary nd-text-secondary-foreground"
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
  const [currentTimeout, setCurrentTimeout] = useState<NodeJS.Timeout | null>(
    null
  )

  const onClick = () => {
    if (currentTimeout) clearTimeout(currentTimeout)
    onCopy()
    setChecked(true)
    setCurrentTimeout(setTimeout(() => setChecked(false), 1500))
  }

  return (
    <button
      className={cn(
        'nd-p-2 nd-rounded-md nd-transition-opacity nd-opacity-0 group-hover:nd-opacity-100',
        className
      )}
      aria-label="Copy Text"
      onClick={onClick}
      {...props}
    >
      {checked ? (
        <CheckIcon className="nd-w-3.5 nd-h-3.5 nd-animate-in nd-fade-in" />
      ) : (
        <CopyIcon className="nd-w-3.5 nd-h-3.5 nd-animate-in nd-fade-in" />
      )}
    </button>
  )
}
