'use client';

import type {
  TabsContentProps,
  TabsProps as BaseProps,
} from '@radix-ui/react-tabs';
import {
  useMemo,
  useState,
  useCallback,
  createContext,
  useContext,
  useRef,
  useLayoutEffect,
  useEffect,
} from 'react';
import { cn } from '@/utils/cn';
import * as Primitive from './ui/tabs';

export { Primitive };

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
  onValueChange: (v: string) => void;
  valueToIdMap: Map<string, string>;
}>({
  onValueChange: () => undefined,
  valueToIdMap: new Map(),
});

export function Tabs({
  groupId,
  items = [],
  persist = false,
  defaultIndex = 0,
  updateAnchor = false,
  children,
  ...props
}: TabsProps): React.ReactElement {
  const values = useMemo(() => items.map((item) => toValue(item)), [items]);
  const [value, setValue] = useState(values[defaultIndex]);
  const valuesRef = useRef(values);
  valuesRef.current = values;

  const valueToIdMapRef = useRef(new Map<string, string>());

  useLayoutEffect(() => {
    if (!groupId) return;

    const onUpdate: ChangeListener = (v) => {
      if (valuesRef.current.includes(v)) setValue(v);
    };

    const previous = persist
      ? localStorage.getItem(groupId)
      : sessionStorage.getItem(groupId);

    if (previous) onUpdate(previous);
    addChangeListener(groupId, onUpdate);
    return () => {
      removeChangeListener(groupId, onUpdate);
    };
  }, [groupId, persist]);

  const onValueChange = useCallback(
    (v: string) => {
      if (updateAnchor) {
        const id = valueToIdMapRef.current.get(v);
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
    },
    [groupId, persist, updateAnchor],
  );

  const contextValue = useMemo(
    () => ({
      onValueChange,
      valueToIdMap: valueToIdMapRef.current,
    }),
    [onValueChange],
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
      <TabsContext.Provider value={contextValue}>
        {children}
      </TabsContext.Provider>
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
  const v = toValue(value);
  const { onValueChange, valueToIdMap } = useContext(TabsContext);

  useEffect(() => {
    const hash = window.location.hash.slice(1);

    if (hash === props.id) {
      onValueChange(v);
    }

    if (props.id) {
      valueToIdMap.set(v, props.id);
    }

    return () => {
      if (props.id) {
        valueToIdMap.delete(v);
      }
    };
  }, [onValueChange, props.id, v, valueToIdMap]);

  return (
    <Primitive.TabsContent
      value={v}
      className={cn(
        'prose-no-margin [&>figure:only-child]:-m-4 [&>figure:only-child]:rounded-none [&>figure:only-child]:border-none',
        className,
      )}
      {...props}
    />
  );
}
