'use client';
import { CheckIcon, CopyIcon } from 'lucide-react';
import type { ButtonHTMLAttributes, HTMLAttributes } from 'react';
import { forwardRef, useCallback, useRef } from 'react';
import { cn } from '@/utils/cn';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCopyButton } from '@/utils/use-copy-button';
import { buttonVariants } from '@/theme/variants';

export type CodeBlockProps = HTMLAttributes<HTMLElement> & {
  allowCopy?: boolean;
  /**
   * Custom attributes to the inner `pre` element
   */
  pre?: HTMLAttributes<HTMLPreElement>;
};

export const Pre = forwardRef<HTMLElement, CodeBlockProps>(
  ({ title, allowCopy = true, pre, className, ...props }, ref) => {
    const preRef = useRef<HTMLPreElement>(null);
    const onCopy = useCallback(() => {
      if (!preRef.current?.textContent) return;

      void navigator.clipboard.writeText(preRef.current.textContent);
    }, []);

    return (
      <figure
        ref={ref}
        className={cn(
          'not-prose group relative my-6 overflow-hidden rounded-lg border bg-secondary/50 text-sm',
          className,
        )}
        {...props}
      >
        {title ? (
          <div className="flex flex-row items-center border-b bg-muted py-1.5 pl-4 pr-2 text-muted-foreground">
            <figcaption className="flex-1">{title}</figcaption>
            {allowCopy ? <CopyButton onCopy={onCopy} /> : null}
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
    );
  },
);

Pre.displayName = 'CodeBlock';

function CopyButton({
  className,
  onCopy,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  onCopy: () => void;
}): JSX.Element {
  const [checked, onClick] = useCopyButton(onCopy);

  return (
    <button
      type="button"
      className={cn(
        buttonVariants({
          color: 'muted',
        }),
        !checked && 'opacity-0',
        'transition-all group-hover:opacity-100',
        className,
      )}
      aria-label="Copy Text"
      onClick={onClick}
      {...props}
    >
      <CheckIcon
        className={cn('size-3.5 transition-transform', !checked && 'scale-0')}
      />
      <CopyIcon
        className={cn(
          'absolute size-3.5 transition-transform',
          checked && 'scale-0',
        )}
      />
    </button>
  );
}
