import type { FumapressConfig } from '@/config';
import { watch } from 'chokidar';
import { normalizeProjects } from './config';
import matcher from 'picomatch';
import path from 'node:path';
import type { Stats } from 'node:fs';
import processPatterns, { getOptions } from '../tinyglobby/patterns';

export function startWatcher(config: FumapressConfig) {
  const projects = normalizeProjects(config.content?.projects);
  const ignored = projects.map((project) => {
    const processed = processPatterns(getOptions({ cwd: project.dir }), project.include, {
      root: project.dir,
      depthOffset: 0,
    });
    const isMatch = matcher(processed.match, {
      ignore: processed.ignore,
    });

    return (filePath: string, stats?: Stats): boolean => {
      if (stats && stats.isFile()) {
        return !isMatch(path.relative(project.dir, filePath));
      }

      return false;
    };
  });

  const watcher = watch(
    projects.map((project) => project.dir),
    {
      ignoreInitial: true,
      followSymlinks: false,
      ignored,
    },
  );

  return watcher;
}
