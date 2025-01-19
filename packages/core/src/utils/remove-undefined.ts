export function removeUndefined<T extends object>(value: T): T {
  const obj = value as Record<string, unknown>;

  for (const key of Object.keys(obj)) {
    if (obj[key] === undefined) delete obj[key];
  }

  return value;
}
