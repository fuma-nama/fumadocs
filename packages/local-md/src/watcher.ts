import { type ChokidarOptions, type Matcher, watch } from 'chokidar';
import ignore, { type Ignore } from 'ignore';
import fs from 'node:fs/promises';
import path from 'node:path';
import { LocalMarkdownConfig } from '.';

export async function startWatcher(config: LocalMarkdownConfig) {
  // init .gitignore
  const ignored = await Promise.all([
    fromGitIgnore(process.cwd(), 'node_modules\ndist\nbuild'),
    fromGitIgnore(config.dir),
  ]);

  let options: ChokidarOptions = {
    ignoreInitial: true,
    followSymlinks: false,
    ignored: ignored.filter((v) => v !== undefined),
  };

  if (config.watchOptions) options = config.watchOptions(options);

  return watch(config.dir, options);
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
