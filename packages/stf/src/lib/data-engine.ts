import { useEffect, useRef, useState } from 'react';
import { objectGet, objectSet, stringifyFieldKey } from './utils';
import type { FieldKey } from './types';
import { Stf, useDataEngine } from './stf';

export type DefaultValue<T = unknown> = T | (() => T);

function getDefaultValue<T>(defaultValue: DefaultValue<T>): T {
  return typeof defaultValue === 'function' ? (defaultValue as () => T)() : defaultValue;
}

export interface DataEngineListener {
  /**
   * when specified, only call the listener for events affecting the specified field.
   */
  field?: FieldKey;
  /**
   * when field value is changed
   */
  onUpdate?: (key: FieldKey, ctx: OnUpdateContext) => void;
  /**
   * when `init(field)` is called
   */
  onInit?: (key: FieldKey) => void;
  /**
   * when `delete(field)` is called
   */
  onDelete?: (key: FieldKey) => void;
}

interface OnUpdateContext {
  /**
   * An update is swallow if the change doesn't affect the values of children fields.
   */
  swallow: boolean;
}

class ListenerManager {
  private readonly listeners = new Set<DataEngineListener>();
  private readonly indexed = new Map<string, Set<DataEngineListener>>();

  add(listener: DataEngineListener) {
    if (!listener.field) {
      this.listeners.add(listener);
      return;
    }
    const key = stringifyFieldKey(listener.field);
    const set = this.indexed.get(key) ?? new Set();
    set.add(listener);
    this.indexed.set(key, set);
  }

  remove(listener: DataEngineListener) {
    if (!listener.field) {
      this.listeners.delete(listener);
    } else {
      this.indexed.get(stringifyFieldKey(listener.field))?.delete(listener);
    }
  }

  onUpdate(field: FieldKey, ctx: OnUpdateContext) {
    for (const v of this.listeners) v.onUpdate?.(field, ctx);
    const updatedKey = stringifyFieldKey(field);

    if (ctx.swallow) {
      const set = this.indexed.get(updatedKey);
      if (set) for (const v of set) v.onUpdate?.(field, ctx);
    } else {
      for (const [k, listeners] of this.indexed.entries()) {
        if (k !== updatedKey && !k.startsWith(updatedKey + '.')) continue;
        for (const v of listeners) v.onUpdate?.(field, ctx);
      }
    }
  }

  onInit(field: FieldKey) {
    for (const v of this.listeners) v.onInit?.(field);
    const set = this.indexed.get(stringifyFieldKey(field));
    if (set) for (const v of set) v.onInit?.(field);
  }

  onDelete(field: FieldKey) {
    for (const v of this.listeners) v.onDelete?.(field);
    const set = this.indexed.get(stringifyFieldKey(field));
    if (set) for (const v of set) v.onDelete?.(field);
  }
}

export class DataEngine {
  private data: NonNullable<object>;
  private attachedDataMap = new Map<string, unknown>();
  private readonly listeners = new ListenerManager();

  constructor(defaultValues: DefaultValue<NonNullable<object>> = {}) {
    this.data = getDefaultValue(defaultValues);
  }

  listen(listener: DataEngineListener) {
    this.listeners.add(listener);
  }

  unlisten(listener: DataEngineListener) {
    this.listeners.remove(listener);
  }

  getData() {
    return this.data;
  }

  /**
   * init a field
   * @param key the key of field
   * @param defaultValue the initial value, the field is also created for `undefined`
   * @returns the value of initialized field, or the current value of field if already initialized
   */
  init(key: FieldKey, defaultValue?: DefaultValue): unknown {
    if (key.length === 0) return this.data;
    let cur = this.data as Record<string, unknown>;
    const currentKey: FieldKey = [];

    for (let i = 0; i < key.length; i++) {
      const propKey = key[i];
      const propValue = cur[propKey];

      if (i === key.length - 1) {
        if (propValue !== undefined) return propValue;
        cur[propKey] = getDefaultValue(defaultValue);

        this.listeners.onUpdate(currentKey, { swallow: true });
        this.listeners.onInit(key);
        return cur[propKey];
      } else if (typeof propValue === 'object' && propValue !== null) {
        cur = propValue as Record<string, unknown>;
      } else {
        if (propValue !== undefined)
          console.warn(
            `the original value of field ${currentKey.join('.')} is overidden, this might be unexpected.`,
          );

        cur = cur[propKey] = {};
        this.listeners.onUpdate(currentKey, { swallow: true });
      }
      currentKey.push(propKey);
    }
  }

  delete(key: FieldKey): unknown | undefined {
    if (key.length === 0) return;
    const parentKey = key.slice(0, -1);
    const prop = key[key.length - 1];
    const parent = this.get(parentKey);

    if (Array.isArray(parent) && typeof prop === 'number') {
      const [deleted] = parent.splice(prop, 1);
      this.listeners.onUpdate(parentKey, { swallow: false });
      this.listeners.onDelete(key);
      return deleted;
    } else if (typeof parent === 'object' && parent !== null) {
      const temp = (parent as Record<string, unknown>)[prop];
      delete parent[prop as never];
      this.listeners.onUpdate(parentKey, { swallow: true });
      this.listeners.onDelete(key);
      return temp;
    }
  }

  get(key: FieldKey) {
    return objectGet(this.data, key);
  }

  /**
   * update the value of field if it exists
   * @returns if the field is updated
   */
  update(key: FieldKey, value: unknown): boolean {
    try {
      this.data = objectSet(this.data, key, value) as NonNullable<object>;
      this.listeners.onUpdate(key, { swallow: false });
      return true;
    } catch {
      return false;
    }
  }

  attachedData<T>(namespace: string) {
    return {
      get: (field: FieldKey): T | undefined => {
        return this.attachedDataMap.get(`${namespace}:${stringifyFieldKey(field)}`) as
          | T
          | undefined;
      },
      set: (field: FieldKey, value: T) => {
        this.attachedDataMap.set(`${namespace}:${stringifyFieldKey(field)}`, value);
      },
      delete: (field?: FieldKey) => {
        if (field) {
          this.attachedDataMap.delete(`${namespace}:${stringifyFieldKey(field)}`);
        } else {
          for (const key of this.attachedDataMap.keys()) {
            if (key.startsWith(`${namespace}:`)) this.attachedDataMap.delete(key);
          }
        }
      },
    };
  }

  reset(data: Record<string, unknown>) {
    this.attachedDataMap.clear();
    this.update([], data);
  }
}

export function useFieldValue<V = unknown>(
  key: FieldKey,
  options: {
    stf?: Stf;
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
  const engine = useDataEngine(options.stf);
  const { compute = (v) => v as V, defaultValue, isChanged = (a, b) => a !== b } = options;
  const [value, setValue] = useState<V>(() => compute(engine.init(key, defaultValue)));

  useListener({
    field: key,
    onUpdate() {
      const computed = compute(engine.get(key));
      if (isChanged(value, computed)) setValue(computed);
    },
    onDelete() {
      const computed = compute(undefined);
      if (isChanged(value, computed)) setValue(computed);
    },
  });

  return [value, (newValue: unknown) => engine.update(key, newValue)] as const;
}

export function useListener(listener: DataEngineListener & { stf?: Stf }) {
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
