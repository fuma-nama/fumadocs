'use client';

import { cn } from '@/utils/cn';
import { SelectTrigger, Select, SelectValue, SelectContent, SelectItem } from './select';
import { type ReactNode, useState, useMemo, type ComponentProps, createContext, use } from 'react';
import { AnchorSection, useAnchorLink } from '@/auto-anchor';

const Context = createContext<{
  value: string | null;
  setValue: (type: string | null) => void;
} | null>(null);

export function SelectTabs({
  defaultValue,
  children,
}: {
  defaultValue?: string;
  children: ReactNode;
}) {
  const [value, setValue] = useState<string | null>(defaultValue ?? null);

  return <Context value={useMemo(() => ({ value, setValue }), [value])}>{children}</Context>;
}

export function SelectTab({
  value,
  anchorSegments,
  ...props
}: ComponentProps<'div'> & {
  value: string;
  /** define the tab as an anchor section */
  anchorSegments?: string[];
}) {
  const { value: currentValue, setValue } = use(Context)!;
  const ref = useAnchorLink(anchorSegments ?? false, () => setValue(value));

  if (value !== currentValue) return;
  const content = <div ref={ref} {...props} />;
  return anchorSegments ? (
    <AnchorSection segments={anchorSegments}>{content}</AnchorSection>
  ) : (
    content
  );
}

/** selects the tab shown in a card, like a media type, a single item is a plain label */
export function SelectTabTrigger({
  items,
  className,
  ...props
}: ComponentProps<typeof SelectTrigger> & {
  items: {
    label: ReactNode;
    value: string;
  }[];
}) {
  const { value, setValue } = use(Context)!;
  if (items.length === 1)
    return <span className="min-w-0 px-1.5 font-medium">{items[0].label}</span>;

  return (
    <Select items={items} value={value} onValueChange={setValue}>
      <SelectTrigger
        className={cn(
          'not-prose h-7 w-auto min-w-0 gap-1 border-0 bg-transparent px-1.5 py-0 text-[0.8125rem] font-medium *:min-w-0 hover:bg-fd-accent hover:text-fd-accent-foreground focus:ring-0 focus-visible:ring-2 focus-visible:ring-inset data-popup-open:bg-fd-accent',
          className,
        )}
        {...props}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map(({ label, value }) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
