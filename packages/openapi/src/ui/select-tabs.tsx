'use client';
import {
  type ComponentProps,
  createContext,
  type ReactNode,
  use,
  useMemo,
  useState,
} from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/components/select';
import { cn } from 'fumadocs-ui/utils/cn';

const Context = createContext<{
  type: string | null;
  setType: (type: string) => void;
} | null>(null);

export function SelectTabs({
  defaultValue,
  children,
}: {
  defaultValue?: string;
  children: ReactNode;
}) {
  const [type, setType] = useState<string | null>(defaultValue ?? null);

  return (
    <Context value={useMemo(() => ({ type, setType }), [type])}>
      {children}
    </Context>
  );
}

export function SelectTab({
  value,
  ...props
}: ComponentProps<'div'> & {
  value: string;
}) {
  const { type } = use(Context)!;
  if (value !== type) return;

  return <div {...props}>{props.children}</div>;
}

export function SelectTabTrigger({
  items,
  ...props
}: ComponentProps<typeof SelectTrigger> & { items: string[] }) {
  const { type, setType } = use(Context)!;

  return (
    <Select value={type ?? ''} onValueChange={setType}>
      <SelectTrigger
        {...props}
        className={cn('not-prose w-fit', props.className)}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((type) => (
          <SelectItem key={type} value={type}>
            {type}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
