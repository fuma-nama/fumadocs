import fs from 'node:fs/promises';
import { exists } from '@/utils/fs';

/**
 * Get dependencies from `package.json`
 */
export async function getDependencies(): Promise<Map<string, string>> {
  const dependencies = new Map<string, string>();

  if (!(await exists('package.json'))) return dependencies;

  const content = await fs.readFile('package.json');
  const parsed = JSON.parse(content.toString()) as object;

  if ('dependencies' in parsed && typeof parsed.dependencies === 'object') {
    const records = parsed.dependencies as Record<string, string>;

    Object.entries(records).forEach(([k, v]) => {
      dependencies.set(k, v);
    });
  }

  if (
    'devDependencies' in parsed &&
    typeof parsed.devDependencies === 'object'
  ) {
    const records = parsed.devDependencies as Record<string, string>;

    Object.entries(records).forEach(([k, v]) => {
      dependencies.set(k, v);
    });
  }

  return dependencies;
}
