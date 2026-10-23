'use client';
import { createContext, type ReactNode, use, useEffect, useMemo, useState } from 'react';
import type { SchemaData, SchemaUIGeneratedData } from '../react';

export interface SchemaUnion {
  schema: Extract<SchemaData, { type: 'or' | 'and' }>;
  /** `$type` of the selected member */
  value: string;
  select: (value: string) => void;
}

export interface SchemaPathItem {
  /** the property it is opened from */
  name: string;
  $ref: string;
  /** the unions of `$ref`, each one after the first is the member selected in the previous one */
  unions: SchemaUnion[];
  /** the schema to show, the member selected in the last union, or `$ref` itself */
  schema: SchemaData;
}

export interface SchemaUIState {
  refs: SchemaUIGeneratedData['refs'];
  /** the opened schemas, starting from the root */
  path: SchemaPathItem[];
  /** open the schema `$ref` of property `name` */
  open: (name: string, $ref: string) => void;
  /** go back to the path item at `index` */
  back: (index: number) => void;
  /** the property of the last path item that the URL links to */
  highlighted?: string;
  /** the URL linking to the property `name` of the path item at `index` */
  getLink: (index: number, name: string) => string;
}

export interface SchemaUIProviderProps {
  /** anchor ID of the root, links are resolved against it */
  id: string;
  name: string;
  generated: SchemaUIGeneratedData;
  children: ReactNode;
}

interface PathEntry {
  name: string;
  $ref: string;
  /** values of the unions, by depth */
  selected?: string[];
}

interface State {
  path: PathEntry[];
  highlighted?: string;
}

const Context = createContext<SchemaUIState | null>(null);
/** roots that already restored their path from the URL */
const restored = new Set<string>();

/**
 * The state of a Schema UI: the schemas opened from properties, the selected members of unions, and links to properties.
 */
export function SchemaUIProvider({ id, name, generated, children }: SchemaUIProviderProps) {
  const { $root, refs } = generated;
  const [state, setState] = useState<State>(() => ({ path: [{ name, $ref: $root }] }));

  useEffect(() => {
    if (restored.has(id)) return;
    const url = new URL(window.location.href);
    const param = url.searchParams.get('path');
    // percent-encoded, like the hash of `getLink()`
    if (url.hash !== new URL(`#${id}`, url).hash || !param) return;

    const path = decodePath(param);
    if (path[0].$ref !== $root || !resolvePath(refs, path, setState)) return;

    const highlighted = url.searchParams.get('s-highlight') ?? undefined;
    restored.add(id);
    setState({ path, highlighted });
    if (!highlighted) document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }, [id, $root, refs]);

  const value = useMemo<SchemaUIState>(
    () => ({
      refs,
      path: resolvePath(refs, state.path, setState)!,
      highlighted: state.highlighted,
      open: (name, $ref) => setState((s) => ({ path: [...s.path, { name, $ref }] })),
      back: (index) => setState((s) => ({ path: s.path.slice(0, index + 1) })),
      getLink(index, name) {
        const url = new URL(window.location.href);
        url.hash = id;
        url.searchParams.set('s-highlight', name);
        url.searchParams.set('path', encodePath(state.path.slice(0, index + 1)));
        return url.href;
      },
    }),
    [id, refs, state],
  );

  return <Context value={value}>{children}</Context>;
}

export function useSchemaUI(): SchemaUIState {
  const ctx = use(Context);
  if (!ctx) throw new Error('Component must be used under <SchemaUIProvider />');

  return ctx;
}

/**
 * The items of `entries`, unless a schema is missing.
 *
 * Schemas are read in the order of the UI, `refs` may only generate a schema after the one it's opened from.
 */
function resolvePath(
  refs: SchemaUIGeneratedData['refs'],
  entries: PathEntry[],
  setState: (update: (state: State) => State) => void,
): SchemaPathItem[] | undefined {
  const path: SchemaPathItem[] = [];

  for (const [index, entry] of entries.entries()) {
    const unions: SchemaUnion[] = [];
    const values: string[] = [];
    let schema: SchemaData | undefined = refs[entry.$ref];

    while (schema && (schema.type === 'or' || schema.type === 'and') && schema.items.length > 0) {
      const depth = values.length;
      const selected = entry.selected?.[depth];
      const value: string = (
        schema.items.find((item) => item.$type === selected) ?? schema.items[0]
      ).$type;

      values.push(value);
      unions.push({
        schema,
        value,
        select: (value) =>
          setState(({ path, highlighted }) => ({
            // the selections of unions after it belong to the previous member
            path: path.with(index, {
              ...path[index],
              selected: [...values.slice(0, depth), value],
            }),
            highlighted,
          })),
      });
      schema = refs[value];
    }

    if (!schema) return;
    path.push({ name: entry.name, $ref: entry.$ref, unions, schema });
  }

  return path;
}

function encodePath(path: PathEntry[]): string {
  return path.map((item) => [item.name, item.$ref, ...(item.selected ?? [])].join('\0')).join('|');
}

function decodePath(param: string): PathEntry[] {
  return param.split('|').map((part) => {
    const [name, $ref, ...selected] = part.split('\0');
    return { name, $ref, selected };
  });
}
