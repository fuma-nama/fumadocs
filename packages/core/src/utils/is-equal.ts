export function isEqualShallow(a: unknown, b: unknown): boolean {
  if (a === b) return true;

  if (Array.isArray(a) && Array.isArray(b)) {
    return b.length === a.length && a.every((v, i) => isEqualShallow(v, b[i]));
  }

  return false;
}
