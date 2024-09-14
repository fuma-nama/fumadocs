export function removeUndefined<T extends object>(value: T): T {
  const obj = value as Record<string, unknown>;
  Object.keys(obj).forEach((key) => {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- Remove undefined values
    if (obj[key] === undefined) delete obj[key];
  });

  return value;
}
