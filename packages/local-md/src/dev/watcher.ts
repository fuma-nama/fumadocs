import { type ChokidarOptions, type Matcher, watch } from 'chokidar';
import ignore, { type Ignore } from 'ignore';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { LocalMarkdown } from '..';
import type { StandardSchemaV1 } from '@standard-schema/spec';

export async function startWatcher(
  instance: LocalMarkdown<StandardSchemaV1, StandardSchemaV1>,
  /**
   * customise chokidar, by default, file watcher will watch all files under the `dir` directory.
   */
  watchOptions?: (options: ChokidarOptions) => ChokidarOptions,
) {
  const dir = instance.config.dir;
  // init .gitignore
  const ignored = await Promise.all([
    fromGitIgnore(process.cwd(), 'node_modules\ndist\nbuild'),
    fromGitIgnore(dir),
  ]);

  let options: ChokidarOptions = {
    ignoreInitial: true,
    followSymlinks: false,
    ignored: ignored.filter((v) => v !== undefined),
  };

  if (watchOptions) options = watchOptions(options);

  return watch(dir, options);
}

async function fromGitIgnore(dir: string, defaultValue?: string) {
  const gitignore = await fs
    .readFile(path.join(dir, '.gitignore'), 'utf-8')
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
