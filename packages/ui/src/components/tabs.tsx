'use client';

import type {
  TabsContentProps,
  TabsProps as BaseProps,
} from '@radix-ui/react-tabs';
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import { cn } from '@/utils/cn';
import * as Primitive from './ui/tabs';
import { useEffectEvent } from 'fumadocs-core/utils/use-effect-event';

export { Primitive };

type CollectionKey = string | symbol;
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

export interface TabsProps extends BaseProps {
  label?: ReactNode;

  /**
   * Identifier for Sharing value of tabs
   */
  groupId?: string;

  /**
   * Enable persistent
   */
  persist?: boolean;
  /**
   * @defaultValue 0
   */
  defaultIndex?: number;

  items?: string[];

  /**
   * If true, updates the URL hash based on the tab's id
   */
  updateAnchor?: boolean;
}

const TabsContext = createContext<{
  items: string[];
  valueToIdMap: Map<string, string>;
  collection: CollectionKey[];
} | null>(null);

function useTabContext() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('You must wrap your component in <Tabs>');
  return ctx;
}

export function Tabs({
  groupId,
  items = [],
  persist = false,
  label,
  defaultIndex = 0,
  updateAnchor = false,
  ...props
}: TabsProps) {
  const values = useMemo(() => items.map((item) => toValue(item)), [items]);
  const [value, setValue] = useState(values[defaultIndex]);
  const valueToIdMap = useMemo(() => new Map<string, string>(), []);
  const collection = useMemo<CollectionKey[]>(() => [], []);

  const onUpdate: ChangeListener = useEffectEvent((v) => {
    if (values.includes(v)) setValue(v);
  });

  useLayoutEffect(() => {
    if (!groupId) return;
    const previous = persist
      ? localStorage.getItem(groupId)
      : sessionStorage.getItem(groupId);

    if (previous) onUpdate(previous);
    addChangeListener(groupId, onUpdate);
    return () => {
      removeChangeListener(groupId, onUpdate);
    };
  }, [groupId, onUpdate, persist]);

  useLayoutEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;

    for (const [value, id] of valueToIdMap.entries()) {
      if (id === hash) {
        setValue(value);
        break;
      }
    }
  }, [valueToIdMap]);

  return (
    <Primitive.Tabs
      value={value}
      onValueChange={(v: string) => {
        if (updateAnchor) {
          const id = valueToIdMap.get(v);

          if (id) {
            window.history.replaceState(null, '', `#${id}`);
          }
        }

        if (groupId) {
          listeners.get(groupId)?.forEach((item) => {
            item(v);
          });

          if (persist) localStorage.setItem(groupId, v);
          else sessionStorage.setItem(groupId, v);
        } else {
          setValue(v);
        }
      }}
      {...props}
      className={cn('my-4', props.className)}
    >
      <Primitive.TabsList>
        {label && (
          <span className="text-sm font-medium my-auto me-auto">{label}</span>
        )}
        {values.map((v, i) => (
          <Primitive.TabsTrigger key={v} value={v}>
            {items[i]}
          </Primitive.TabsTrigger>
        ))}
      </Primitive.TabsList>
      <TabsContext.Provider
        value={useMemo(
          () => ({ items, valueToIdMap, collection }),
          [valueToIdMap, collection, items],
        )}
      >
        {props.children}
      </TabsContext.Provider>
    </Primitive.Tabs>
  );
}

function toValue(v: string): string {
  return v.toLowerCase().replace(/\s/, '-');
}

export type TabProps = Omit<TabsContentProps, 'value'> & {
  /**
   * Value of tab, detect from index if unspecified.
   */
  value?: TabsContentProps['value'];
};

export function Tab({ value, className, ...props }: TabProps) {
  const { items, valueToIdMap } = useTabContext();
  const resolvedValue =
    value ??
    // eslint-disable-next-line react-hooks/rules-of-hooks -- `value` is not supposed to change
    items.at(useCollectionIndex());
  if (!resolvedValue)
    throw new Error(
      'Failed to resolve tab `value`, please pass a `value` prop to the Tab component.',
    );

  const v = toValue(resolvedValue);

  if (props.id) {
    valueToIdMap.set(v, props.id);
  }

  return (
    <Primitive.TabsContent
      value={v}
      className={cn(
        'prose-no-margin [&>figure:only-child]:-m-4 [&>figure:only-child]:border-none',
        className,
      )}
      {...props}
    >
      {props.children}
    </Primitive.TabsContent>
  );
}

/**
 * Inspired by Headless UI.
 *
 * Return the index of children, this is made possible by registering the order of render from children using React context.
 * This is supposed by work with pre-rendering & pure client-side rendering.
 */
function useCollectionIndex() {
  const key = useId();
  const { collection } = useTabContext();

  useEffect(() => {
    return () => {
      const idx = collection.indexOf(key);
      if (idx !== -1) collection.splice(idx, 1);
    };
  }, [key, collection]);

  if (!collection.includes(key)) collection.push(key);
  return collection.indexOf(key);
}
