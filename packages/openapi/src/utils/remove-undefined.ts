export function removeUndefined<T extends object>(value: T, deep = false): T {
  const obj = value as Record<string, unknown>;

  for (const key in obj) {
    if (obj[key] === undefined) delete obj[key];
    if (!deep) continue;

    const entry = obj[key];

    if (typeof entry === 'object' && entry !== null) {
      removeUndefined(entry, deep);
      continue;
    }

    if (Array.isArray(entry)) {
      for (const item of entry) removeUndefined(item, deep);
    }
  }

  return value;
}
