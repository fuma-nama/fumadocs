export function removeUndefined<T extends object>(value: T, deep = false): T {
  const obj = value as Record<string, unknown>;

  for (const key of Object.keys(obj)) {
    if (obj[key] === undefined) delete obj[key];

    if (deep && typeof obj[key] === 'object' && obj[key] !== null) {
      removeUndefined(obj[key], deep);
    } else if (deep && Array.isArray(obj[key])) {
      obj[key].forEach((v) => removeUndefined(v, deep));
    }
  }

  return value;
}
