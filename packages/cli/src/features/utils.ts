import fs from 'node:fs/promises';
import path from 'node:path';
import type { Project, ReactFramework } from '@/project';
import type { PackageJson } from '@/features';

/** the shallowest `.ts`/`.tsx` file under `dir` whose content includes `needle`, relative to `cwd` */
export async function findSource(cwd: string, dir: string, needle: string) {
  const entries = await fs
    .readdir(path.join(cwd, dir), { recursive: true, withFileTypes: true })
    .catch(() => []);
  entries.sort((a, b) => a.parentPath.length - b.parentPath.length);

  for (const entry of entries) {
    if (!entry.isFile() || !/\.tsx?$/.test(entry.name) || entry.parentPath.includes('node_modules'))
      continue;
    const file = path.join(entry.parentPath, entry.name);
    if ((await fs.readFile(file, 'utf-8')).includes(needle)) return path.relative(cwd, file);
  }
}

export function scripts(json: PackageJson, scripts: Record<string, string>) {
  Object.assign((json.scripts ??= {}), scripts);
}

export const reactOnly = (project: Project) =>
  project.framework !== 'astro' || 'Astro is not supported by this feature';

export function reactFramework(project: Project): ReactFramework {
  if (project.framework === 'astro') throw new Error('Astro is not supported by this feature');
  return project.framework;
}
