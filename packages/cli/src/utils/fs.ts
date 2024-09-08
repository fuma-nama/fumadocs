import fs from 'node:fs/promises';
import path from 'node:path';

export async function exists(pathLike: string): Promise<boolean> {
  try {
    await fs.access(pathLike);
    return true;
  } catch {
    return false;
  }
}

export function isRelative(from: string, to: string): boolean {
  return !path.relative(from, to).startsWith(`..${path.sep}`);
}
