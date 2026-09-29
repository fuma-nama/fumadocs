'use client';

import { cn } from '@/utils/cn';
import { SelectTrigger, Select, SelectValue, SelectContent, SelectItem } from './select';
import {
  type ReactNode,
  useState,
  useMemo,
  type ComponentProps,
  createContext,
  use,
  useEffect,
} from 'react';
import { anchorIdStartsWith } from '@/auto-anchor';
import { AnchorSection, useAnchorId } from '@/auto-anchor/client';

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
  const id = useAnchorId(anchorSegments ?? false);

  useEffect(() => {
    if (id && anchorIdStartsWith(window.location.hash.slice(1), id)) setValue(value);
  }, [id, value, setValue]);

  if (value !== currentValue) return;
  const content = <div {...props} />;
  return anchorSegments ? (
    <AnchorSection segments={anchorSegments}>{content}</AnchorSection>
  ) : (
    content
  );
}

export function SelectTabTrigger({
  items,
  className,
  placeholder,
  ...props
}: ComponentProps<typeof SelectTrigger> & {
  placeholder?: ReactNode;
  items: {
    label: ReactNode;
    value: string;
  }[];
}) {
  const { value, setValue } = use(Context)!;

  return (
    <Select items={items} value={value} onValueChange={setValue}>
      <SelectTrigger className={cn('not-prose w-fit min-w-0 *:min-w-0', className)} {...props}>
        <SelectValue placeholder={placeholder} />
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
