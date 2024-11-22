import type { HTMLAttributes } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/utils/cn';

export interface TagItem {
  name: string;
  value: string | undefined;

  props?: HTMLAttributes<HTMLButtonElement>;
}

export interface TagsListProps extends HTMLAttributes<HTMLDivElement> {
  tag?: string;
  onTagChange: (tag: string | undefined) => void;
  allowClear?: boolean;

  items: TagItem[];
}

const itemVariants = cva(
  'rounded-md border px-2 py-0.5 text-xs font-medium text-fd-muted-foreground transition-colors',
  {
    variants: {
      active: {
        true: 'bg-fd-accent text-fd-accent-foreground',
      },
    },
  },
);

export function TagsList({
  tag,
  onTagChange,
  items,
  allowClear,
  ...props
}: TagsListProps) {
  return (
    <div
      {...props}
      className={cn('flex flex-row items-center gap-1', props.className)}
    >
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          data-active={tag === item.value}
          className={cn(
            itemVariants({ active: tag === item.value }),
            item.props?.className,
          )}
          onClick={() => {
            if (tag === item.value && allowClear) {
              onTagChange(undefined);
            } else {
              onTagChange(item.value);
            }
          }}
          tabIndex={-1}
          {...item.props}
        >
          {item.name}
        </button>
      ))}
      {props.children}
    </div>
  );
}
