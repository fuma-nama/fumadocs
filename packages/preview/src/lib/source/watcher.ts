import type { ParsedAppConfig } from '@/config';
import { type Matcher, watch } from 'chokidar';
import { normalizeProjects } from './config';
import ignore, { type Ignore } from 'ignore';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function startWatcher(config: ParsedAppConfig) {
  const projects = normalizeProjects(config.content.projects);
  // init .gitignore
  const ignored = await Promise.all([
    fromGitIgnore(process.env.ROOT_DIR ?? process.cwd(), 'node_modules\ndist\nbuild'),
    ...projects.map((project) => fromGitIgnore(project.dir)),
  ]);

  const watcher = watch([], {
    ignoreInitial: true,
    followSymlinks: false,
    ignored: ignored.filter((v) => v !== undefined),
  });

  for (const project of projects) {
    if (project.watch) watcher.add(project.dir);
  }

  return watcher;
}

async function fromGitIgnore(dir: string, defaultValue?: string) {
  const gitignore = await fs
    .readFile(path.join(dir, '.gitignore'))
    .then((res) => res.toString())
    .catch(() => defaultValue);

  if (gitignore) {
    const ig = ignore();
    ig.add(gitignore);
    return toMatcher(dir, ig);
  }
}

function toMatcher(dir: string, ig: Ignore): Matcher {
  return (v) => {
    const relativePath = path.relative(dir, v);
    // for invalid path, don't ignore
    return ignore.isPathValid(relativePath) && ig.checkIgnore(relativePath).ignored;
  };
}
