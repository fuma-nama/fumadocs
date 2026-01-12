/* eslint-disable react-hooks/rules-of-hooks */
import { useEffect, useRef, useState } from 'react';
import { objectGet, arrayStartsWith } from './utils';
import type { FieldKey } from './types';

export interface DataEngineListener {
  onUpdate?: (key: FieldKey) => void;
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
   * @param value the initial value, the field is also created for `undefined`
   * @returns the value of initialized field, or the current value of field if already initialized
   */
  init(key: FieldKey, value?: unknown): unknown {
    if (key.length === 0) throw new Error('cannot init for empty key.');
    let cur = this.store as NonNullable<object>;
    const parentKey = key.slice(0, -1);
    const currentKey: FieldKey = [];
    const lastKey = key[key.length - 1];

    for (const prop of parentKey) {
      const propValue: unknown = cur[prop as keyof object];

      if (typeof propValue === 'object' && propValue !== null) {
        cur = propValue;
      } else {
        if (propValue !== undefined)
          console.warn(
            `the original value of field ${currentKey.join('.')} is overidden, this might be unexpected.`,
          );
        this.fireOnUpdate(currentKey);
        cur = cur[prop as keyof object] = {} as never;
      }

      currentKey.push(prop);
    }

    const prev = cur[lastKey as keyof object];
    if (prev !== undefined) return prev;
    cur[lastKey as keyof object] = value as never;
    return value;
  }

  delete(key: FieldKey): unknown {
    if (key.length === 0) return;

    const parentKey = key.slice(0, -1);
    const prop = key[key.length - 1] as keyof object;
    const parent = this.get(parentKey);

    if (Array.isArray(parent)) {
      this.update(
        parentKey,
        parent.filter((_, i) => i !== prop),
      );
      return parent[prop];
    } else if (typeof parent === 'object' && parent !== null) {
      const next = { ...parent };
      delete next[prop];
      this.update(parentKey, next);

      return parent[prop];
    }
  }

  get(key: FieldKey) {
    return objectGet(this.store, key);
  }

  /**
   * update the value of field if it exists
   */
  update(key: FieldKey, value: unknown): boolean {
    if (key.length === 0) {
      this.store = value;
      this.fireOnUpdate(key);
      return true;
    }

    const v = objectGet(this.store, key.slice(0, -1));
    if (typeof v !== 'object' || v === null) return false;
    v[key[key.length - 1] as keyof object] = value as never;
    this.fireOnUpdate(key);
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
    key: FieldKey,
    options: {
      defaultValue?: unknown;
      compute?: (currentValue: unknown) => V;
      /** determine whether the value/computed value is changed */
      isChanged?: (prev: V, next: V) => boolean;
    } = {},
  ) {
    const { compute = (v) => v as V, defaultValue, isChanged = (a, b) => a !== b } = options;
    const [value, setValue] = useState<V>(() => compute(this.init(key, defaultValue)));

    this.useListener({
      onUpdate: (updatedKey) => {
        if (!arrayStartsWith(key, updatedKey) && !arrayStartsWith(updatedKey, key)) return;
        const computed = compute(this.get(key));
        if (isChanged(value, computed)) setValue(computed);
      },
    });

    return [value, (newValue: unknown) => this.update(key, newValue)] as const;
  }

  private fireOnUpdate(field: FieldKey) {
    for (const listener of this.listeners) listener.onUpdate?.(field);
  }
}
