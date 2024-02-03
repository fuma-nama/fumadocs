'use client';
import { CheckIcon, CopyIcon } from 'lucide-react';
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { forwardRef, useCallback, useRef } from 'react';
import type { CodeBlockIcon } from 'fumadocs-core/mdx-plugins';
import { cn } from '@/utils/cn';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCopyButton } from '@/utils/use-copy-button';
import { buttonVariants } from '@/theme/variants';

export type CodeBlockProps = HTMLAttributes<HTMLElement> & {
  /**
   * Icon of code block
   *
   * If specified as string, it will be parsed as JSON, assuming it is `CodeBlockIcon`
   *
   * if equal to `default`, use the default icon instead.
   */
  icon?: ReactNode;

  allowCopy?: boolean;
};

export const Pre = forwardRef<HTMLPreElement, HTMLAttributes<HTMLPreElement>>(
  ({ className, ...props }, ref) => {
    return (
      <pre ref={ref} className={cn('nd-codeblock py-4', className)} {...props}>
        {props.children}
      </pre>
    );
  },
);

Pre.displayName = 'Pre';

export const CodeBlock = forwardRef<HTMLElement, CodeBlockProps>(
  ({ title, allowCopy = true, icon, className, ...props }, ref) => {
    let iconEl = icon;

    if (typeof icon === 'string') {
      const parsed = JSON.parse(icon) as CodeBlockIcon;

      iconEl = (
        <svg viewBox={parsed.viewBox} className="size-4">
          <path fill={parsed.fill} d={parsed.d} />
        </svg>
      );
    }

    const areaRef = useRef<HTMLDivElement>(null);
    const onCopy = useCallback(() => {
      const pre = areaRef.current?.getElementsByTagName('pre').item(0);

      if (!pre) return;

      const clone = pre.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('.nd-copy-ignore').forEach((node) => {
        node.remove();
      });

      const text = clone.textContent || '';

      void navigator.clipboard.writeText(text);
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
          <div className="flex flex-row items-center gap-2 border-b bg-muted px-4 py-1.5 text-muted-foreground">
            {iconEl}
            <figcaption className="flex-1 truncate">{title}</figcaption>
            {allowCopy ? (
              <CopyButton className="-mr-2" onCopy={onCopy} />
            ) : null}
          </div>
        ) : (
          allowCopy && (
            <CopyButton
              className="absolute right-2 top-2 z-[2]"
              onCopy={onCopy}
            />
          )
        )}
        <ScrollArea ref={areaRef}>{props.children}</ScrollArea>
      </figure>
    );
  },
);

CodeBlock.displayName = 'CodeBlock';

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
          className: 'transition-all group-hover:opacity-100',
        }),
        !checked && 'opacity-0',
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
