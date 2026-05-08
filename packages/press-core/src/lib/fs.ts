import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

/**
 * Returns the absolute path to the root directory of the current git repository.
 */
export function getGitRootDir(startDir = process.cwd()): string | null {
  let dir = startDir;
  while (true) {
    if (existsSync(join(dir, '.git'))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      break; // reached filesystem root
    }
    dir = parent;
  }

  return null;
}
