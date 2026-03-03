import type { ProjectConfig } from '@/config';
import path from 'node:path';

export function normalizeProjects(projects: ProjectConfig[]): ProjectConfig[] {
  const baseDir = process.env.PROJECT_DIR ?? process.cwd();

  return projects.map((project) => ({
    ...project,
    dir: path.resolve(baseDir, project.dir),
  }));
}
