'use client';

import type {
  TabsContentProps,
  TabsProps as BaseProps,
} from '@radix-ui/react-tabs';
import {
  useMemo,
  useState,
  type ReactNode,
  useCallback,
  useLayoutEffect,
} from 'react';
import { cn } from '@/utils/cn';
import * as Primitive from './ui/tabs';

export * as Primitive from './ui/tabs';

type ChangeListener = (v: string) => void;
const listeners = new Map<string, ChangeListener[]>();

function addChangeListener(id: string, listener: ChangeListener): void {
  const list = listeners.get(id) ?? [];
  list.push(listener);
  listeners.set(id, list);
}

function removeChangeListener(id: string, listener: ChangeListener): void {
  const list = listeners.get(id) ?? [];
  listeners.set(
    id,
    list.filter((item) => item !== listener),
  );
}

function update(id: string, v: string, persist: boolean): void {
  listeners.get(id)?.forEach((item) => {
    item(v);
  });

  if (persist) localStorage.setItem(id, v);
  else sessionStorage.setItem(id, v);
}

export interface TabsProps extends BaseProps {
  // TODO: Rename to group id so that it won't confuse with HTML `id` attribute (next major)
  /**
   * Identifier for Sharing value of tabs
   */
  id?: string;
  /**
   * Enable persistent
   */
  persist?: boolean;
  /**
   * @defaultValue 0
   */
  defaultIndex?: number;

  items?: string[];
}

export function Tabs({
  id,
  items = [],
  persist = false,
  defaultIndex = 0,
  ...props
}: TabsProps): React.ReactElement {
  const values = useMemo(() => items.map((item) => toValue(item)), [items]);
  const [value, setValue] = useState(values[defaultIndex]);

  useLayoutEffect(() => {
    if (!id) return;

    const onUpdate: ChangeListener = (v) => {
      if (values.includes(v)) setValue(v);
    };

    const previous = persist
      ? localStorage.getItem(id)
      : sessionStorage.getItem(id);

    if (previous) onUpdate(previous);
    addChangeListener(id, onUpdate);
    return () => {
      removeChangeListener(id, onUpdate);
    };
  }, [id, persist, values]);

  const onValueChange = useCallback(
    (v: string) => {
      if (id) {
        update(id, v, persist);
      } else {
        setValue(v);
      }
    },
    [id, persist],
  );

  return (
    <Primitive.Tabs
      value={value}
      onValueChange={onValueChange}
      {...props}
      className={cn('my-4', props.className)}
    >
      <Primitive.TabsList>
        {values.map((v, i) => (
          <Primitive.TabsTrigger key={v} value={v}>
            {items[i]}
          </Primitive.TabsTrigger>
        ))}
      </Primitive.TabsList>
      {props.children}
    </Primitive.Tabs>
  );
}

function toValue(v: string): string {
  return v.toLowerCase().replace(/\s/, '-');
}

export function Tab({
  value,
  className,
  ...props
}: TabsContentProps): React.ReactElement {
  return (
    <Primitive.TabsContent
      value={toValue(value)}
      className={cn(
        'prose-no-margin [&>figure:only-child]:-m-4 [&>figure:only-child]:rounded-none [&>figure:only-child]:border-none',
        className,
      )}
      {...props}
    />
  );
}
