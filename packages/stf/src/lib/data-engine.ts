/* eslint-disable react-hooks/rules-of-hooks */
import { createContext, use, useEffect, useRef, useState } from 'react';
import { objectGet, arrayStartsWith } from './utils';

export interface DataEngineListener {
  onUpdate?: (key: string[], value: unknown) => void;
}

export class DataEngine {
  store: unknown;
  private readonly listeners: DataEngineListener[] = [];

  constructor(defaultValues: unknown) {
    this.store = defaultValues;
  }

  listen(listener: DataEngineListener) {
    this.listeners.push(listener);
  }

  unlisten(listener: DataEngineListener) {
    const idx = this.listeners.indexOf(listener);
    if (idx !== -1) this.listeners.splice(idx, 1);
  }

  /**
   * init a field
   * @param key the key of field
   * @param value the initial value, only create the parent objects if `undefined`
   * @returns the value of initialized field, or the current value of field if already initialized
   */
  init(key: string[], value?: unknown): unknown {
    if (key.length === 0) throw new Error('cannot init for empty key.');
    let cur = this.store as NonNullable<object>;
    const parentKey = key.slice(0, -1);
    const lastKey = key[key.length - 1];

    for (const prop of parentKey) {
      const propValue: unknown = cur[prop as keyof object];

      if (propValue === undefined) {
        cur[prop as keyof object] = {} as never;
      } else if (typeof propValue === 'object' && propValue !== null) {
        cur = propValue;
      } else {
        console.warn(
          `the original value of field ${parentKey.join('.')} is overidden, this might be unexpected.`,
        );
        cur[prop as keyof object] = {} as never;
      }
    }

    const prev = cur[lastKey as keyof object];
    if (prev !== undefined) return prev;
    if (value !== undefined) {
      cur[lastKey as keyof object] = value as never;
    }

    return value;
  }

  get(key: string[]) {
    return objectGet(this.store, key);
  }

  /**
   * update the value of field if it exists
   */
  update(key: string[], value: unknown): boolean {
    const emitEvent = () => {
      for (const listener of this.listeners) listener.onUpdate?.(key, value);
    };
    if (key.length === 0) {
      this.store = value;
      emitEvent();
      return true;
    }

    const v = objectGet(this.store, key.slice(0, -1));
    if (typeof v !== 'object' || v === null) return false;
    v[key[key.length - 1] as keyof object] = value as never;
    emitEvent();
    return true;
  }

  useListener(listener: DataEngineListener) {
    const listenerRef = useRef(listener);
    listenerRef.current = listener;

    useEffect(() => {
      const internal: DataEngineListener = {
        onUpdate(...args) {
          return listenerRef.current.onUpdate?.(...args);
        },
      };

      this.listen(internal);
      return () => {
        this.unlisten(internal);
      };
    }, []);
  }

  useFieldValue<V = unknown>(
    key: string[],
    options: {
      defaultValue?: unknown;
      compute?: (currentValue: unknown) => V;
      /** determine whether the value/computed value is changed */
      isChanged?: (prev: V, next: V) => boolean;
    } = {},
  ) {
    const engine = useDataEngine();
    const { compute = (v) => v as V, defaultValue, isChanged = (a, b) => a !== b } = options;
    const [value, setValue] = useState<V>(() => compute(engine.init(key, defaultValue)));

    engine.useListener({
      onUpdate(updatedKey) {
        if (!arrayStartsWith(key, updatedKey) && !arrayStartsWith(updatedKey, key)) return;
        const computed = compute(engine.get(key));
        if (isChanged(value, computed)) setValue(computed);
      },
    });

    return [value, (newValue: unknown) => engine.update(key, newValue)] as const;
  }
}

const Context = createContext<DataEngine | null>(null);

export const DataEngineProvider = Context.Provider;

export function useDataEngine(): DataEngine {
  return use(Context)!;
}
