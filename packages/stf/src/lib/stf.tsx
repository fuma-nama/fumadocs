import { createContext, ReactNode, use, useEffect, useMemo, useRef, useState } from 'react';
import {
  DataEngine,
  getDefaultValue,
  type DataEngineListener,
  type DefaultValue,
} from './data-engine';
import type { FieldKey } from './types';
import { deepEqual, isPlainObject } from './utils';

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
  const optionsRef = useRef(options);
  optionsRef.current = options;

  return useMemo(
    () => ({
      dataEngine: new DataEngine(optionsRef.current.defaultValues),
    }),
    [],
  );
}

export function useDataEngine(instance?: Stf | DataEngine) {
  if (instance instanceof DataEngine) return instance;
  if (instance) return instance.dataEngine;
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
  const { defaultValue } = options;
  const [items] = useFieldValue(field, {
    defaultValue,
    compute(value) {
      const items: ArrayItemInfo[] = [];
      if (!Array.isArray(value)) return items;

      for (let i = 0; i < value.length; i++) {
        items.push({
          field: [...field, i],
          index: i,
        });
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
      const idx = Array.isArray(value) ? value.length : 0;
      engine.init([...field, idx], itemValue);
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
    /** ignore fixed properties unless defined  */
    lazy?: boolean;
    properties: Record<string, T>;
    patternProperties?: Record<string, T>;
    fallback?: T;
  },
) {
  const {
    properties: definedProps,
    patternProperties: definedPatternProps = {},
    defaultValue,
    fallback,
    lazy,
  } = options;
  const engine = useDataEngine();
  const [objectKeys] = useFieldValue(field, {
    defaultValue,
    compute(currentValue) {
      return isPlainObject(currentValue) ? Object.keys(currentValue) : [];
    },
    isChanged(prev, next) {
      return !deepEqual(prev, next);
    },
  });

  const properties = useMemo(() => {
    const properties: PropertyItemInfo<T>[] = [];
    const unknownKeys = new Set(objectKeys);
    for (const [key, prop] of Object.entries(definedProps)) {
      if (lazy && !unknownKeys.has(key)) continue;
      unknownKeys.delete(key);

      properties.push({
        kind: 'fixed',
        field: [...field, key],
        key,
        info: prop,
      });
    }

    for (const [pattern, prop] of Object.entries(definedPatternProps)) {
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

    if (fallback) {
      for (const key of unknownKeys) {
        properties.push({
          kind: 'fallback',
          field: [...field, key],
          key,
          info: fallback,
        });
      }
    }

    return properties;
  }, [definedPatternProps, definedProps, fallback, field, lazy, objectKeys]);

  return {
    properties,
    _objectKeys: objectKeys,
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

export function useFieldValue<V = unknown>(
  key: FieldKey,
  options: {
    stf?: Stf | DataEngine;
    defaultValue?: DefaultValue;

    /**
     * compute value from the actual field value.
     *
     * to re-compute on in-place updates (may happen on objects, arrays), you should clone the object here.
     */
    compute?: (currentValue: unknown) => V;
    /** determine whether the value/computed value is changed */
    isChanged?: (prev: V, next: V) => boolean;
  } = {},
) {
  const { stf, compute = (v) => v as V, defaultValue, isChanged = (a, b) => a !== b } = options;
  const engine = useDataEngine(stf);
  const [value, setValue] = useState<V>(() =>
    compute(defaultValue === undefined ? engine.get(key) : engine.init(key, defaultValue)),
  );
  const prevEngineRef = useRef(engine);

  if (prevEngineRef.current !== engine) {
    setValue(
      compute(defaultValue === undefined ? engine.get(key) : engine.init(key, defaultValue)),
    );
    prevEngineRef.current = engine;
  }

  function onUpdate() {
    const computed = compute(engine.get(key));
    setValue((prev) => (isChanged(prev, computed) ? computed : prev));
  }

  useListener({
    field: key,
    stf,
    onInit: onUpdate,
    onUpdate: onUpdate,
    onDelete() {
      const computed = compute(undefined);
      setValue((prev) => (isChanged(prev, computed) ? computed : prev));
    },
  });

  return [value, (newValue: unknown) => engine.update(key, newValue)] as const;
}

export function useListener(listener: DataEngineListener & { stf?: Stf | DataEngine }) {
  const engine = useDataEngine(listener.stf);
  const listenerRef = useRef(listener);
  listenerRef.current = listener;

  useEffect(() => {
    const internal: DataEngineListener = {
      field: listener.field,
      onDelete(...args) {
        return listenerRef.current.onDelete?.(...args);
      },
      onInit(...args) {
        return listenerRef.current.onInit?.(...args);
      },
      onUpdate(...args) {
        return listenerRef.current.onUpdate?.(...args);
      },
    };

    engine.listen(internal);
    return () => {
      engine.unlisten(internal);
    };
  }, [engine, listener.field]);
}

export function useNamespace(options: {
  namespace: string;
  initial?: DefaultValue<NonNullable<object>>;
  stf?: Stf | DataEngine;
}) {
  const { namespace, stf, initial } = options;
  const engine = useDataEngine(stf);
  return engine.namespace(namespace, initial, {
    reset({ engine }) {
      engine.update([], getDefaultValue(initial));
    },
  });
}
