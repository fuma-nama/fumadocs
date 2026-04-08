import fs from 'node:fs/promises';

export async function exists(pathLike: string): Promise<boolean> {
  try {
    await fs.access(pathLike);
    return true;
  } catch {
    return false;
  }
}
