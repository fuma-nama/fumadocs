'use client';

import {
  type ComponentProps,
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { cn } from '@/utils/cn';
import * as Primitive from './ui/tabs';
import { useEffectEvent } from 'fumadocs-core/utils/use-effect-event';
import { mergeRefs } from '@/utils/merge-refs';

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

export interface TabsProps extends ComponentProps<typeof Primitive.Tabs> {
  /**
   * Identifier for Sharing value of tabs
   */
  groupId?: string;

  /**
   * Enable persistent
   */
  persist?: boolean;

  /**
   * If true, updates the URL hash based on the tab's id
   */
  updateAnchor?: boolean;

  /**
   * Use simple mode instead of advanced usage as documented in https://radix-ui.com/primitives/docs/components/tabs.
   */
  items?: string[];

  /**
   * Shortcut for `defaultValue` when `items` is provided.
   *
   * @defaultValue 0
   */
  defaultIndex?: number;

  /**
   * Additional label in tabs list when `items` is provided.
   */
  label?: ReactNode;
}

const TabsContext = createContext<{
  items?: string[];
  valueToIdMap: Map<string, string>;
  collection: CollectionKey[];
} | null>(null);

function useTabContext() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('You must wrap your component in <Tabs>');
  return ctx;
}

export const TabsList = Primitive.TabsList;
export const TabsTrigger = Primitive.TabsTrigger;

export function Tabs({
  ref,
  className,
  groupId,
  items,
  persist = false,
  label,
  defaultIndex = 0,
  updateAnchor = false,
  defaultValue = items ? escapeValue(items[defaultIndex]) : undefined,
  ...props
}: TabsProps) {
  const tabsRef = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState(defaultValue);
  const valueToIdMap = useMemo(() => new Map<string, string>(), []);
  const collection = useMemo<CollectionKey[]>(() => [], []);

  const onUpdate: ChangeListener = useEffectEvent((v) => {
    if (items && !items.some((item) => escapeValue(item) === v)) return;
    setValue(v);
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
        tabsRef.current?.scrollIntoView();
        break;
      }
    }
  }, [valueToIdMap]);

  return (
    <Primitive.Tabs
      ref={mergeRefs(ref, tabsRef)}
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
      className={cn('my-4', className)}
      {...props}
    >
      {items && (
        <TabsList>
          {label && (
            <span className="text-sm font-medium my-auto me-auto">{label}</span>
          )}
          {items.map((item) => (
            <TabsTrigger key={item} value={escapeValue(item)}>
              {item}
            </TabsTrigger>
          ))}
        </TabsList>
      )}
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

export interface TabProps
  extends Omit<ComponentProps<typeof Primitive.TabsContent>, 'value'> {
  /**
   * Value of tab, detect from index if unspecified.
   */
  value?: string;
}

export function Tab({ value, ...props }: TabProps) {
  const { items } = useTabContext();
  const resolved =
    value ??
    // eslint-disable-next-line react-hooks/rules-of-hooks -- `value` is not supposed to change
    items?.at(useCollectionIndex());
  if (!resolved)
    throw new Error(
      'Failed to resolve tab `value`, please pass a `value` prop to the Tab component.',
    );

  return (
    <TabsContent value={escapeValue(resolved)} {...props}>
      {props.children}
    </TabsContent>
  );
}

export function TabsContent({
  value,
  className,
  ...props
}: ComponentProps<typeof Primitive.TabsContent>) {
  const { valueToIdMap } = useTabContext();

  if (props.id) {
    valueToIdMap.set(value, props.id);
  }

  return (
    <Primitive.TabsContent
      value={value}
      forceMount
      className={cn(
        'prose-no-margin data-[state=inactive]:hidden [&>figure:only-child]:-m-4 [&>figure:only-child]:border-none',
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

function escapeValue(v: string): string {
  return v.toLowerCase().replace(/\s/, '-');
}
