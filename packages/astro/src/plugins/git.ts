import fs from 'node:fs';
import path from 'node:path';
import type { AnyPage, Plugin } from '../app';

export interface GitOptions {
  /** the user or organization owning the repository */
  user: string;
  repo: string;
  branch: string;

  /**
   * The URL of GitHub, for GitHub Enterprise.
   *
   * @defaultValue 'https://github.com'
   */
  url?: string;

  /**
   * The root directory of repository, needed when building without the `.git` directory.
   *
   * @defaultValue the closest directory with `.git`
   */
  rootDir?: string;
}

/**
 * Link the source files of docs pages on GitHub, and show their last modified dates from the git history.
 */
export function gitPlugin({
  user,
  repo,
  branch,
  url = 'https://github.com',
  rootDir = findRootDir(),
}: GitOptions): Plugin {
  // file, relative to `rootDir` -> date
  let dates: Promise<Map<string, Date>> | undefined;

  return {
    name: 'git',
    async transformPage(page, data) {
      const file = page.absolutePath && path.relative(rootDir, page.absolutePath);
      if (!file || file.startsWith('..') || path.isAbsolute(file)) return data;
      const name = file.replaceAll(path.sep, '/');
      dates ??= getDates(rootDir, this.getPages());
      return {
        ...data,
        githubUrl: `${url}/${user}/${repo}/blob/${branch}/${name}`,
        lastModified: (await dates).get(name) ?? data.lastModified,
      };
    },
  };
}

function findRootDir(): string {
  let dir = process.cwd();
  while (!fs.existsSync(path.join(dir, '.git'))) {
    const parent = path.dirname(dir);
    if (parent === dir) return process.cwd();
    dir = parent;
  }
  return dir;
}

/** one `git log` for the directory containing every page */
async function getDates(rootDir: string, pages: AnyPage[]): Promise<Map<string, Date>> {
  const dates = new Map<string, Date>();
  let dir: string | undefined;
  for (const page of pages) {
    if (!page.absolutePath) continue;
    dir ??= path.dirname(page.absolutePath);
    while (path.relative(dir, page.absolutePath).startsWith('..')) dir = path.dirname(dir);
  }
  if (!dir) return dates;

  // dynamic, as server bundles of some adapters have no `child_process`
  const { execFile } = await import('node:child_process');
  const stdout = await new Promise<string>((resolve) => {
    execFile(
      'git',
      ['-c', 'core.quotepath=off', 'log', '--format=commit:%aI', '--name-only', '--', dir],
      { cwd: rootDir, maxBuffer: Infinity },
      // without git, or the history, pages have no dates
      (error, out) => resolve(error ? '' : out),
    );
  });

  // newest first, the first date of a file is its last modified date
  let date: Date | undefined;
  for (const line of stdout.split('\n')) {
    if (line.startsWith('commit:')) date = new Date(line.slice('commit:'.length));
    else if (line && date && !dates.has(line)) dates.set(line, date);
  }
  return dates;
}
