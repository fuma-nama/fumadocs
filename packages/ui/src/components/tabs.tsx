'use client';

import type { TabsContentProps } from '@radix-ui/react-tabs';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { cn } from '@/utils/cn';
import * as Primitive from './ui/tabs';

export * as Primitive from './ui/tabs';

type ListenerObject = () => void;
const valueMap = new Map<string, string>();
const listeners = new Map<string, Set<ListenerObject>>();

function add(id: string, listener: ListenerObject): void {
  if (listeners.has(id)) {
    listeners.get(id)?.add(listener);
  } else {
    listeners.set(id, new Set([listener]));
  }
}

function remove(id: string, listener: ListenerObject): void {
  listeners.get(id)?.delete(listener);
}

function update(id: string, v: string, persist: boolean): void {
  valueMap.set(id, v);
  listeners.get(id)?.forEach((item) => {
    item();
  });

  if (persist) localStorage.setItem(id, v);
}

export interface TabsProps {
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
  children: ReactNode;
}

export function Tabs({
  id,
  items = [],
  persist = false,
  defaultIndex = 0,
  children,
}: TabsProps): JSX.Element {
  const values = useMemo(() => items.map((item) => toValue(item)), [items]);
  const [value, setValue] = useState(values[defaultIndex]);

  useEffect(() => {
    if (!id) return;

    const onUpdate = (): void => {
      const current = valueMap.get(id);
      // Only if item exists
      if (current && values.includes(current)) setValue(current);
    };

    if (persist) {
      const previous = localStorage.getItem(id);

      if (previous) update(id, previous, persist);
    }

    add(id, onUpdate);
    onUpdate();
    return () => {
      remove(id, onUpdate);
    };
  }, [id, persist, values]);

  const onValueChange = (v: string): void => {
    if (id) {
      update(id, v, persist);
    } else {
      setValue(v);
    }
  };

  return (
    <Primitive.Tabs value={value} onValueChange={onValueChange}>
      <Primitive.TabsList>
        {values.map((v, i) => (
          <Primitive.TabsTrigger key={v} value={v}>
            {items[i]}
          </Primitive.TabsTrigger>
        ))}
      </Primitive.TabsList>
      {children}
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
}: TabsContentProps): JSX.Element {
  return (
    <Primitive.TabsContent
      value={toValue(value)}
      className={cn('prose-no-margin', className)}
      {...props}
    />
  );
}
