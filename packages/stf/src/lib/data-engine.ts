import {
  fieldKeyStartsWith,
  isPlainObject,
  objectGet,
  objectSet,
  stringifyFieldKey,
} from './utils';
import type { FieldKey } from './types';

export type DefaultValue<T = unknown> = T | (() => T);

export function getDefaultValue<T>(defaultValue: DefaultValue<T>): T {
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

export interface NamespaceConfig {
  reset?: (ctx: { engine: DataEngine }) => void;
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
  readonly namespaces = new Map<string, { engine: DataEngine } & NamespaceConfig>();
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
   * @param field the key of field
   * @param defaultValue the initial value, the field is also created for `undefined`
   * @returns the value of initialized field, or the current value of field if already initialized
   */
  init(field: FieldKey, defaultValue?: DefaultValue, ctx: OnInitContext = {}): unknown {
    if (field.length === 0) return this.data;
    const parentKey: FieldKey = [];
    const parentUpdateCtx: OnUpdateContext = { swallow: true, ...ctx };
    let parent = this.data as Record<string, unknown> | unknown[];

    const fieldsToInit: FieldKey[] = [];
    let initStart: FieldKey | null = null;

    for (let i = 0; i < field.length; i++) {
      const key = field[i];
      // @ts-expect-error -- allow access
      const value: unknown = parent[key];

      if (i === field.length - 1) {
        if (value !== undefined) return value;
        // @ts-expect-error -- allow access
        const out = (parent[key] = getDefaultValue(defaultValue));

        fieldsToInit.push(field);
        for (const initField of fieldsToInit) this.listeners.onInit(initField, ctx);
        this.listeners.onUpdate(initStart ?? parentKey, parentUpdateCtx);
        return out;
      } else if (isPlainObject(value) || Array.isArray(value)) {
        parent = value;
        parentKey.push(key);
      } else {
        const nextKey = field[i + 1];
        // @ts-expect-error -- allow access
        parent = parent[key] = typeof nextKey === 'number' ? new Array(nextKey + 1) : {};

        if (value === undefined) {
          initStart ??= [...parentKey];
          parentKey.push(key);
          fieldsToInit.push([...parentKey]);
        } else {
          parentKey.push(key);
          this.listeners.onUpdate(parentKey, parentUpdateCtx);
          console.warn(
            `the original value of field ${parentKey.join('.')} is overridden, this might be unexpected.`,
          );
        }
      }
    }
  }

  delete(key: FieldKey, ctx: OnDeleteContext = {}): unknown | undefined {
    if (key.length === 0) return;
    const parentKey = key.slice(0, -1);
    const prop = key[key.length - 1];
    const parent = this.get(parentKey);

    if (typeof prop === 'number' && Array.isArray(parent)) {
      if (parent.length === 0) return;
      const isLast = prop === parent.length - 1;
      const deleted: unknown[] = parent.splice(prop, 1);
      if (deleted.length === 0) return;

      this.listeners.onDelete(key, ctx);
      // it will change children's field value when removed at middle
      this.listeners.onUpdate(parentKey, { swallow: isLast, ...ctx });
      return deleted[0];
    } else if (isPlainObject(parent) && prop in parent) {
      const temp = parent[prop];
      delete parent[prop];
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
  namespace(
    namespace: string,
    initialValue?: DefaultValue<NonNullable<object>>,
    config?: NamespaceConfig,
  ) {
    let child = this.namespaces.get(namespace);
    if (!child) {
      child = { engine: new DataEngine(initialValue), ...config };
      this.namespaces.set(namespace, child);
    } else {
      Object.assign(child, config);
    }

    return child.engine;
  }

  reset(data: NonNullable<object>) {
    this.update([], data);
    for (const { engine, reset } of this.namespaces.values()) reset?.({ engine });
  }
}
