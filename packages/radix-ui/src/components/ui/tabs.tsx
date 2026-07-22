'use client';

import {
  type ComponentProps,
  createContext,
  use,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import * as Primitive from '@radix-ui/react-tabs';
import { mergeRefs } from '@/utils/merge-refs';

type ChangeListener = (v: string) => void;
const listeners = new Map<string, Set<ChangeListener>>();

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
}

const TabsContext = createContext<{
  valueToIdMap: Map<string, string>;
  /**
   * Mounted tab panels, mapped by their value.
   *
   * Only populated for panels that stay in the DOM (e.g. `forceMount`), which is
   * what allows us to open the tab containing a hash target.
   */
  panels: Map<string, HTMLElement>;
} | null>(null);

function useTabContext() {
  const ctx = use(TabsContext);
  if (!ctx) throw new Error('You must wrap your component in <Tabs>');
  return ctx;
}

export const TabsList = Primitive.TabsList;

export const TabsTrigger = Primitive.TabsTrigger;

export function Tabs({
  ref,
  groupId,
  persist = false,
  updateAnchor = false,
  defaultValue,
  value: _value,
  onValueChange: _onValueChange,
  ...props
}: TabsProps) {
  const tabsRef = useRef<HTMLDivElement>(null);
  const valueToIdMap = useMemo(() => new Map<string, string>(), []);
  const panels = useMemo(() => new Map<string, HTMLElement>(), []);
  const [value, setValue] =
    _value === undefined
      ? // eslint-disable-next-line react-hooks/rules-of-hooks -- not supposed to change controlled/uncontrolled
        useState(defaultValue)
      : // eslint-disable-next-line react-hooks/rules-of-hooks -- not supposed to change controlled/uncontrolled
        [_value, useEffectEvent((v: string) => _onValueChange?.(v))];

  useLayoutEffect(() => {
    if (!groupId) return;
    let previous = sessionStorage.getItem(groupId);
    if (persist) previous ??= localStorage.getItem(groupId);
    if (previous) setValue(previous);

    const groupListeners = listeners.get(groupId) ?? new Set();
    groupListeners.add(setValue);
    listeners.set(groupId, groupListeners);
    return () => {
      groupListeners.delete(setValue);
    };
  }, [groupId, persist, setValue]);

  useLayoutEffect(() => {
    const openFromHash = () => {
      const hash = window.location.hash.slice(1);
      if (!hash) return;

      // hash points to a tab's own anchor id
      for (const [value, id] of valueToIdMap.entries()) {
        if (id === hash) {
          setValue(value);
          tabsRef.current?.scrollIntoView();
          return;
        }
      }

      // hash points to an element inside a mounted (e.g. `forceMount`) panel,
      // open the tab it belongs to, then scroll to it once the panel is visible.
      const target = document.getElementById(hash);
      if (!target) return;

      for (const [value, panel] of panels.entries()) {
        if (!panel.contains(target)) continue;

        setValue(value);
        requestAnimationFrame(() => target.scrollIntoView());
        return;
      }
    };

    openFromHash();
    window.addEventListener('hashchange', openFromHash);
    return () => window.removeEventListener('hashchange', openFromHash);
  }, [setValue, valueToIdMap, panels]);

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
          const groupListeners = listeners.get(groupId);
          if (groupListeners) {
            for (const listener of groupListeners) listener(v);
          }

          sessionStorage.setItem(groupId, v);
          if (persist) localStorage.setItem(groupId, v);
        } else {
          setValue(v);
        }
      }}
      {...props}
    >
      <TabsContext value={useMemo(() => ({ valueToIdMap, panels }), [valueToIdMap, panels])}>
        {props.children}
      </TabsContext>
    </Primitive.Tabs>
  );
}

export function TabsContent({
  value,
  ref,
  ...props
}: ComponentProps<typeof Primitive.TabsContent>) {
  const { valueToIdMap, panels } = useTabContext();

  if (props.id) {
    valueToIdMap.set(value, props.id);
  }

  return (
    <Primitive.TabsContent
      ref={mergeRefs(ref, (element) => {
        if (element) panels.set(value, element);
        else panels.delete(value);
      })}
      value={value}
      {...props}
    >
      {props.children}
    </Primitive.TabsContent>
  );
}
