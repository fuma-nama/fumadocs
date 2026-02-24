import { useEffect, useRef, useState } from 'react';
import { fieldKeyStartsWith, objectGet, objectSet, stringifyFieldKey } from './utils';
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
   * when field value is changed.
   */
  onUpdate?: (key: FieldKey, ctx: OnUpdateContext) => void;
  /**
   * fired on `init(field)`.
   */
  onInit?: (key: FieldKey, ctx: OnInitContext) => void;
  /**
   * fired on `delete(field)`.
   *
   * when `field` is specified, this is also fired when parent is deleted.
   */
  onDelete?: (key: FieldKey, ctx: OnDeleteContext) => void;
}

export interface OnUpdateContext {
  /**
   * An update is swallow if the change doesn't affect the values of children fields.
   */
  swallow: boolean;

  /** custom data */
  custom?: Record<string, unknown>;
}

export interface OnDeleteContext {
  /** custom data */
  custom?: Record<string, unknown>;
}

export interface OnInitContext {
  /** custom data */
  custom?: Record<string, unknown>;
}

class ListenerManager {
  private readonly unindexed = new Set<DataEngineListener>();
  private readonly indexed = new Map<string, Set<DataEngineListener>>();

  add(listener: DataEngineListener) {
    if (!listener.field) {
      this.unindexed.add(listener);
      return;
    }
    const key = stringifyFieldKey(listener.field);
    const set = this.indexed.get(key) ?? new Set();
    set.add(listener);
    this.indexed.set(key, set);
  }

  remove(listener: DataEngineListener) {
    if (!listener.field) {
      this.unindexed.delete(listener);
    } else {
      this.indexed.get(stringifyFieldKey(listener.field))?.delete(listener);
    }
  }

  onUpdate(field: FieldKey, ctx: OnUpdateContext) {
    for (const v of this.unindexed) v.onUpdate?.(field, ctx);
    const updatedKey = stringifyFieldKey(field);

    if (ctx.swallow) {
      const set = this.indexed.get(updatedKey);
      if (set) for (const v of set) v.onUpdate?.(field, ctx);
    } else {
      for (const [k, listeners] of this.indexed.entries()) {
        if (!fieldKeyStartsWith(k, updatedKey)) continue;

        for (const v of listeners) v.onUpdate?.(field, ctx);
      }
    }
  }

  onInit(field: FieldKey, ctx: OnInitContext) {
    for (const v of this.unindexed) v.onInit?.(field, ctx);
    const set = this.indexed.get(stringifyFieldKey(field));
    if (set) for (const v of set) v.onInit?.(field, ctx);
  }

  onDelete(field: FieldKey, ctx: OnDeleteContext) {
    const fieldKey = stringifyFieldKey(field);
    for (const v of this.unindexed) v.onDelete?.(field, ctx);

    for (const [k, listeners] of this.indexed.entries()) {
      if (!fieldKeyStartsWith(k, fieldKey)) continue;

      for (const v of listeners) v.onDelete?.(field, ctx);
    }
  }
}

export class DataEngine {
  private data: NonNullable<object>;
  /** namespace -> engine */
  private namespaces = new Map<string, DataEngine>();
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
  init(key: FieldKey, defaultValue?: DefaultValue, ctx: OnInitContext = {}): unknown {
    if (key.length === 0) return this.data;
    let cur = this.data as Record<string, unknown>;
    const currentKey: FieldKey = [];
    const parentUpdateCtx = { swallow: true, ...ctx };

    for (let i = 0; i < key.length; i++) {
      const propKey = key[i];
      const propValue = cur[propKey];

      if (i === key.length - 1) {
        if (propValue !== undefined) return propValue;
        cur[propKey] = getDefaultValue(defaultValue);

        this.listeners.onUpdate(currentKey, parentUpdateCtx);
        this.listeners.onInit(key, ctx);
        return cur[propKey];
      } else if (typeof propValue === 'object' && propValue !== null) {
        cur = propValue as Record<string, unknown>;
      } else {
        if (propValue !== undefined)
          console.warn(
            `the original value of field ${currentKey.join('.')} is overidden, this might be unexpected.`,
          );

        cur = cur[propKey] = {};
        this.listeners.onUpdate(currentKey, parentUpdateCtx);
      }
      currentKey.push(propKey);
    }
  }

  delete(key: FieldKey, ctx: OnDeleteContext = {}): unknown | undefined {
    if (key.length === 0) return;
    const parentKey = key.slice(0, -1);
    const prop = key[key.length - 1];
    const parent = this.get(parentKey);

    if (Array.isArray(parent) && typeof prop === 'number') {
      const deleted: unknown[] = parent.splice(prop, 1);
      if (deleted.length === 0) return;

      this.listeners.onDelete(key, ctx);
      // it will change children's field value when removed at middle
      this.listeners.onUpdate(parentKey, { swallow: false, ...ctx });
      return deleted[0];
    } else if (typeof parent === 'object' && parent !== null) {
      const temp = (parent as Record<string, unknown>)[prop];
      delete parent[prop as never];
      this.listeners.onDelete(key, ctx);
      this.listeners.onUpdate(parentKey, { swallow: true, ...ctx });
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
  update(key: FieldKey, value: unknown, ctx?: Partial<OnUpdateContext>): boolean {
    try {
      this.data = objectSet(this.data, key, value) as NonNullable<object>;
      this.listeners.onUpdate(key, { swallow: false, ...ctx });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * create an isolated data engine
   */
  namespace(namespace: string, initialValue?: DefaultValue<NonNullable<object>>) {
    let child = this.namespaces.get(namespace);
    if (!child) {
      child = new DataEngine(initialValue);
      this.namespaces.set(namespace, child);
    }

    return child;
  }

  reset(data: Record<string, unknown>) {
    this.namespaces.clear();
    this.update([], data);
  }
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
  const engine = useDataEngine(options.stf);
  const { compute = (v) => v as V, defaultValue, isChanged = (a, b) => a !== b } = options;
  const [value, setValue] = useState<V>(() => compute(engine.init(key, defaultValue)));

  useListener({
    field: key,
    stf: options.stf,
    onInit() {
      const computed = compute(engine.get(key));
      setValue((prev) => (isChanged(prev, computed) ? computed : prev));
    },
    onUpdate() {
      const computed = compute(engine.get(key));
      setValue((prev) => (isChanged(prev, computed) ? computed : prev));
    },
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
