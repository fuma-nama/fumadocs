import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/utils/cn'
import { CheckIcon, CopyIcon } from 'lucide-react'
import type { ButtonHTMLAttributes, HTMLAttributes } from 'react'
import { forwardRef, useCallback, useEffect, useRef, useState } from 'react'

export type PreProps = HTMLAttributes<HTMLElement> & {
  allowCopy?: boolean
}

export const Pre = forwardRef<HTMLElement, PreProps>(
  ({ title, allowCopy = true, className, ...props }, ref) => {
    const preRef = useRef<HTMLPreElement>(null)
    const onCopy = useCallback(() => {
      if (preRef.current?.textContent == null) return

      navigator.clipboard.writeText(preRef.current.textContent)
    }, [])

    return (
      <figure
        ref={ref}
        className={cn(
          'nd-relative nd-overflow-hidden nd-group nd-border nd-rounded-lg nd-text-sm nd-bg-secondary/50 nd-my-6 nd-not-prose',
          className
        )}
        {...props}
      >
        {title ? (
          <div className="nd-flex nd-flex-row nd-items-center nd-bg-muted nd-text-muted-foreground nd-pl-4 nd-pr-2 nd-py-1.5 nd-border-b">
            <figcaption className="nd-flex-1">{title}</figcaption>
            {allowCopy && <CopyButton onCopy={onCopy} />}
          </div>
        ) : (
          allowCopy && (
            <CopyButton
              className="nd-absolute nd-top-2 nd-right-2 nd-z-[2]"
              onCopy={onCopy}
            />
          )
        )}
        <ScrollArea>
          <pre data-nd-codeblock ref={preRef} className="nd-py-4">
            {props.children}
          </pre>
        </ScrollArea>
      </figure>
    )
  }
)

Pre.displayName = 'Pre'

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
        'nd-inline-flex nd-p-2 nd-rounded-md nd-text-secondary-foreground nd-bg-muted nd-transition-opacity nd-opacity-0 group-hover:nd-opacity-100',
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
