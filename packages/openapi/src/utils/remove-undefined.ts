import { isPlainObject } from './is-plain-object';

export function removeUndefined<T extends object>(value: T, deep = false): T {
  if (!isPlainObject(value)) return value;

  for (const key in value) {
    const prop = value[key];
    if (prop === undefined) {
      delete value[key];
      continue;
    }

    if (deep) {
      if (Array.isArray(prop)) {
        for (const item of prop) removeUndefined(item, deep);
      }

      if (isPlainObject(prop)) {
        removeUndefined(prop, deep);
      }
    }
  }

  return value;
}
