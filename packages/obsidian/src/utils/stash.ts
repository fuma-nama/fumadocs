import path from 'node:path';

export function stash(v: string): string {
  const sep = path.sep;

  if (sep !== '/') return v.replaceAll(path.sep, '/');
  return v;
}
