import type { projectConfigSchema } from '@/config';
import path from 'node:path';
import { getDefaultProjectDirectories } from '../env';
import type z from 'zod';

export interface NormalizedProjectConfig extends Omit<
  z.output<typeof projectConfigSchema>,
  'include' | 'dir'
> {
  include: string[];
  dir: string;
}

export function normalizeProjects(
  projects?: z.output<typeof projectConfigSchema>[],
): NormalizedProjectConfig[] {
  const baseDir = process.env.ROOT_DIR ?? process.cwd();

  if (!projects || projects.length === 0) {
    projects = getDefaultProjectDirectories().map((dir) => ({
      dir,
      name: path.basename(dir),
      watch: true,
    }));
  }

  return projects.map((project) => ({
    ...project,
    include: project.include ?? ['**/*.{md,mdx}', '**/meta.json', '!**/node_modules/**/*'],
    assetsDir: project.assetsDir?.map((dir) => path.resolve(baseDir, dir)),
    dir: path.resolve(baseDir, project.dir),
  }));
}
