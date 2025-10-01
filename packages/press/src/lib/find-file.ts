import { access } from 'node:fs/promises';

export async function findFile(paths: string[]): Promise<string | undefined> {
  for (const path of paths) {
    try {
      await access(path);
      return path;
    } catch {
      continue;
    }
  }
}
