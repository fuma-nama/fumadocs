'use client';

import { cn } from '@/utils/cn';
import { SelectTrigger, Select, SelectValue, SelectContent, SelectItem } from './select';
import { type ReactNode, useState, useMemo, type ComponentProps, createContext, use } from 'react';

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
  ...props
}: ComponentProps<'div'> & {
  value: string;
}) {
  const ctx = use(Context);
  if (value !== ctx?.value) return;

  return <div {...props}>{props.children}</div>;
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
