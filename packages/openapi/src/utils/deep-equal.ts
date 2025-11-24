export function deepEqual(
  a: unknown,
  b: unknown,
  visited: Set<object> = new Set(),
): boolean {
  if (a === b) {
    return true;
  }

  if (a == null || b == null) {
    return false;
  }

  if (typeof a !== 'object' || typeof b !== 'object') {
    return false;
  }

  // Handle circular references
  if (visited.has(a) || visited.has(b)) {
    return a === b; // If already visited, compare references to avoid infinite recursion
  }

  visited.add(a);
  visited.add(b);

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false;
    }
    return a.every((item, index) =>
      deepEqual(item, b[index], new Set(visited)),
    );
  }

  if (Array.isArray(a) || Array.isArray(b)) {
    return false;
  }

  const keysA = Object.keys(a as object);
  const keysB = Object.keys(b as object);

  if (keysA.length !== keysB.length) {
    return false;
  }

  return keysA.every(
    (key) =>
      Object.prototype.hasOwnProperty.call(b, key) &&
      deepEqual(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key],
        new Set(visited),
      ),
  );
}
