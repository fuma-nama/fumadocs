import type { ProjectConfig } from '@/config';
import path from 'node:path';

export type NormalizedProjectConfig = Pick<Required<ProjectConfig>, 'include' | 'dir'> &
  ProjectConfig;

export const DefaultProjects: ProjectConfig[] = [{ dir: '', name: 'root' }];

export function normalizeProjects(
  projects: ProjectConfig[] = DefaultProjects,
): NormalizedProjectConfig[] {
  const baseDir = process.env.PROJECT_DIR ?? process.cwd();

  return projects.map((project) => ({
    ...project,
    include: project.include ?? ['**/*.{md,mdx}', '**/meta.json', '!**/node_modules/**/*'],
    dir: path.resolve(baseDir, project.dir),
  }));
}
