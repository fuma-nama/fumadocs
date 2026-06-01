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
import { anchorIdStartsWith } from '@/utils/auto-anchor';
import { AnchorSection, useAnchorId } from '@/utils/auto-anchor.client';

const Context = createContext<{
  value: string | null;
  setValue: (type: string) => void;
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
  anchorSegments: segments,
  ...props
}: ComponentProps<'div'> & {
  value: string;
  /** define the tab as an anchor section */
  anchorSegments?: string[];
}) {
  const { value: currentValue, setValue } = use(Context)!;
  const id = useAnchorId(...(segments ?? []));

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash || !segments) return;

    if (anchorIdStartsWith(hash, id)) setValue(value);
  }, [id, segments, value, setValue]);

  if (value !== currentValue) return;
  const content = <div {...props} />;
  return segments ? <AnchorSection segments={segments}>{content}</AnchorSection> : content;
}

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

  return (
    <Select value={value ?? ''} onValueChange={setValue}>
      <SelectTrigger className={cn('not-prose w-fit min-w-0 *:min-w-0', className)} {...props}>
        <SelectValue>{value && items.find((item) => item.value === value)?.label}</SelectValue>
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
