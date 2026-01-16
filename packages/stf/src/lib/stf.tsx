import { createContext, ReactNode, use, useMemo } from 'react';
import { DataEngine, DefaultValue, useFieldValue } from './data-engine';
import { FieldKey } from './types';
import { deepEqual } from './utils';

const Context = createContext<Stf | null>(null);

export interface Stf {
  dataEngine: DataEngine;
}

export function StfProvider({ value, children }: { value: Stf; children: ReactNode }) {
  return <Context value={value}>{children}</Context>;
}

export function useStf(options: {
  /**
   * Note: the passed object will be modified in place, use `structuredClone()` to keep the original object unchanged.
   */
  defaultValues?: DefaultValue<Record<string, unknown>>;
}): Stf {
  const { defaultValues } = options;

  const dataEngine = useMemo(
    () => new DataEngine(defaultValues),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- assume unchanged
    [],
  );
  return useMemo(
    () => ({
      dataEngine,
    }),
    [dataEngine],
  );
}

export function useDataEngine(stf?: Stf) {
  if (stf) return stf.dataEngine;
  return use(Context)!.dataEngine;
}

export interface ArrayItemInfo {
  field: FieldKey;
  index: number;
}

export function useArray(
  field: FieldKey,
  options: { defaultValue?: DefaultValue<unknown[]> } = {},
) {
  const engine = useDataEngine();
  const [items] = useFieldValue(field, {
    defaultValue: options.defaultValue,
    compute(value) {
      const items: ArrayItemInfo[] = [];
      if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
          items.push({
            field: [...field, i],
            index: i,
          });
        }
      }
      return items;
    },
    isChanged(prev, next) {
      return prev.length !== next.length;
    },
  });

  return {
    items,
    insertItem(itemValue?: unknown) {
      const value = engine.get(field);

      engine.update(field, Array.isArray(value) ? [...value, itemValue] : [itemValue]);
    },
    removeItem(index: number) {
      engine.delete([...field, index]);
    },
  };
}
export type PropertyItemInfo<T> =
  | {
      kind: 'fixed' | 'fallback';
      field: FieldKey;
      key: string;
      info: T;
    }
  | {
      kind: 'pattern';
      field: FieldKey;
      key: string;
      pattern: string;
      info: T;
    };

export function useObject<T>(
  field: FieldKey,
  options: {
    defaultValue?: DefaultValue<object>;
    properties: Record<string, T>;
    patternProperties?: Record<string, T>;
    fallback?: T;
  },
) {
  const engine = useDataEngine();
  const [objectKeys] = useFieldValue(field, {
    defaultValue: options.defaultValue,
    compute(currentValue) {
      return currentValue ? Object.keys(currentValue) : [];
    },
    isChanged(prev, next) {
      return !deepEqual(prev, next);
    },
  });

  const properties = useMemo(() => {
    const properties: PropertyItemInfo<T>[] = [];
    const unknownKeys = new Set(objectKeys);
    for (const [key, prop] of Object.entries(options.properties)) {
      unknownKeys.delete(key);
      properties.push({
        kind: 'fixed',
        field: [...field, key],
        key,
        info: prop,
      });
    }

    for (const [pattern, prop] of Object.entries(options.patternProperties ?? {})) {
      const regex = RegExp(pattern);

      for (const key of unknownKeys) {
        if (!key.match(regex)) continue;
        unknownKeys.delete(key);
        properties.push({
          kind: 'pattern',
          info: prop,
          key,
          pattern,
          field: [...field, key],
        });
      }
    }

    if (options.fallback) {
      for (const key of unknownKeys) {
        properties.push({
          kind: 'fallback',
          field: [...field, key],
          key,
          info: options.fallback,
        });
      }
    }

    return properties;
  }, [field, objectKeys, options.fallback, options.patternProperties, options.properties]);

  return {
    properties,
    onAppend(name: string, value?: unknown) {
      name = name.trim();
      if (name.length === 0) return;

      engine.init([...field, name], value);
    },
    onDelete(name: string) {
      return engine.delete([...field, name]);
    },
  };
}
