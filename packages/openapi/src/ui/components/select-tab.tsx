'use client';

import { cn } from '@/utils/cn';
import { SelectTrigger, Select, SelectValue, SelectContent, SelectItem } from './select';
import {
  type ReactNode,
  useState,
  useMemo,
  useCallback,
  type ComponentProps,
  createContext,
  use,
} from 'react';

const Context = createContext<{
  value: string | null;
  setValue: (type: string) => void;
} | null>(null);

export function SelectTabs({
  defaultValue,
  value: controlledValue,
  onValueChange,
  children,
}: {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
}) {
  const [internalValue, setInternalValue] = useState<string | null>(defaultValue ?? null);

  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;
  const setValue = useCallback(
    (next: string) => {
      if (!isControlled) setInternalValue(next);
      onValueChange?.(next);
    },
    [isControlled, onValueChange],
  );

  return (
    <Context value={useMemo(() => ({ value, setValue }), [value, setValue])}>{children}</Context>
  );
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
