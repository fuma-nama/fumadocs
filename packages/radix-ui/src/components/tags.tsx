import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/utils/cn';

export function TagList({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div {...props} className={cn('not-prose flex flex-wrap items-center gap-2', className)} />
  );
}

const tagVariants = cva(
  'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium no-underline transition-colors',
  {
    variants: {
      active: {
        true: 'border-fd-border bg-fd-accent text-fd-accent-foreground',
        false:
          'border-fd-border text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-accent-foreground',
      },
    },
    defaultVariants: {
      active: false,
    },
  },
);

export type TagProps = {
  children: ReactNode;
  count?: ReactNode;
} & VariantProps<typeof tagVariants> &
  (
    | ({ href: string } & Omit<ComponentProps<'a'>, 'children' | 'href'>)
    | ({ href?: undefined } & Omit<ComponentProps<'span'>, 'children'>)
  );

export function Tag({ active, count, children, className, ...props }: TagProps) {
  const content = (
    <>
      <span>{children}</span>
      {count != null ? <span className="ms-1 text-fd-muted-foreground">{count}</span> : null}
    </>
  );

  if (props.href !== undefined) {
    return (
      <a {...props} data-active={active} className={cn(tagVariants({ active }), className)}>
        {content}
      </a>
    );
  }

  return (
    <span {...props} data-active={active} className={cn(tagVariants({ active }), className)}>
      {content}
    </span>
  );
}
