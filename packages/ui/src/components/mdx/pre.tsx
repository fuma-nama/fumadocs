import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/utils/cn'
import { CheckIcon, CopyIcon } from 'lucide-react'
import type { ButtonHTMLAttributes, HTMLAttributes } from 'react'
import { forwardRef, useCallback, useEffect, useRef, useState } from 'react'

export type CodeBlockProps = HTMLAttributes<HTMLElement> & {
  allowCopy?: boolean
  /**
   * Custom attributes to the inner `pre` element
   */
  pre?: HTMLAttributes<HTMLPreElement>
}

export const Pre = forwardRef<HTMLElement, CodeBlockProps>(
  ({ title, allowCopy = true, pre, className, ...props }, ref) => {
    const preRef = useRef<HTMLPreElement>(null)
    const onCopy = useCallback(() => {
      if (preRef.current?.textContent == null) return

      navigator.clipboard.writeText(preRef.current.textContent)
    }, [])

    return (
      <figure
        ref={ref}
        className={cn(
          'bg-secondary/50 not-prose group relative my-6 overflow-hidden rounded-lg border text-sm',
          className
        )}
        {...props}
      >
        {title ? (
          <div className="bg-muted text-muted-foreground flex flex-row items-center border-b py-1.5 pl-4 pr-2">
            <figcaption className="flex-1">{title}</figcaption>
            {allowCopy && <CopyButton onCopy={onCopy} />}
          </div>
        ) : (
          allowCopy && (
            <CopyButton
              className="absolute right-2 top-2 z-[2]"
              onCopy={onCopy}
            />
          )
        )}
        <ScrollArea>
          <pre
            ref={preRef}
            {...pre}
            className={cn('nd-codeblock py-4', pre?.className)}
          >
            {props.children}
          </pre>
        </ScrollArea>
      </figure>
    )
  }
)

Pre.displayName = 'CodeBlock'

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
        'text-secondary-foreground bg-muted inline-flex rounded-md p-2 opacity-0 transition-opacity group-hover:opacity-100',
        className
      )}
      aria-label="Copy Text"
      onClick={onClick}
      {...props}
    >
      <CheckIcon
        className={cn(
          'h-3.5 w-3.5 transition-transform',
          !checked && 'scale-0'
        )}
      />
      <CopyIcon
        className={cn(
          'absolute h-3.5 w-3.5 transition-transform',
          checked && 'scale-0'
        )}
      />
    </button>
  )
}
