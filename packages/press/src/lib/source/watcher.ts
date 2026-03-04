import type { FumapressConfig } from '@/config';
import { type ChokidarOptions, type Matcher, watch } from 'chokidar';
import { normalizeProjects } from './config';
import ignore from 'ignore';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function startWatcher(config: FumapressConfig) {
  const projects = normalizeProjects(config.content?.projects);
  // init .gitignore
  const ignored = await Promise.all(
    projects.map(async (project): Promise<Matcher> => {
      const ig = ignore();
      const gitignore = await fs
        .readFile(path.join(project.dir, '.gitignore'))
        .then((res) => res.toString())
        .catch(() => 'node_modules');
      ig.add(gitignore);

      return (v) => {
        const relativePath = path.relative(project.dir, v);
        // for invalid path, don't ignore
        return ignore.isPathValid(relativePath) && ig.checkIgnore(relativePath).ignored;
      };
    }),
  );

  let options: ChokidarOptions = {
    ignoreInitial: true,
    followSymlinks: false,
    ignored,
  };

  for (const project of projects) {
    options = project.watchOptions(options);
  }

  return watch(
    projects.map((project) => project.dir),
    options,
  );
}
