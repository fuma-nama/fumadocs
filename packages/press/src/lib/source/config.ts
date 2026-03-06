import type { ProjectConfig } from '@/config';
import path from 'node:path';
import { getDefaultProjectDirectories } from '../env';

export type NormalizedProjectConfig = Pick<Required<ProjectConfig>, 'include' | 'dir'> &
  ProjectConfig;

export function normalizeProjects(projects?: ProjectConfig[]): NormalizedProjectConfig[] {
  const baseDir = process.env.ROOT_DIR ?? process.cwd();
  projects ??= getDefaultProjectDirectories().map((dir) => ({ dir, name: path.basename(dir) }));

  return projects.map((project) => ({
    ...project,
    include: project.include ?? ['**/*.{md,mdx}', '**/meta.json', '!**/node_modules/**/*'],
    assetsDir: project.assetsDir?.map((dir) => path.resolve(baseDir, dir)),
    dir: path.resolve(baseDir, project.dir),
  }));
}
