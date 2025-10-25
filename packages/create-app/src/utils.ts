import fs from 'node:fs/promises';
import path, { join } from 'node:path';
import { x } from 'tinyexec';

export async function writeFile(file: string, content: string) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, content);
}

export async function copy(
  from: string,
  to: string,
  options: {
    rename?: (s: string) => string;
    filter?: (s: string) => boolean;
    filterDir?: (dir: string) => boolean;
  } = {},
): Promise<void> {
  const {
    rename = (s) => s,
    filterDir = () => true,
    filter = () => true,
  } = options;
  const stats = await fs.stat(from);

  if (stats.isDirectory() && filterDir(from)) {
    const files = await fs.readdir(from);

    await Promise.all(
      files.map((file) =>
        copy(path.join(from, file), path.join(to, file), options),
      ),
    );
  }

  if (stats.isFile() && filter(from)) {
    to = rename(to);
    await fs.mkdir(path.dirname(to), { recursive: true });
    await fs.copyFile(from, to);
  }
}

async function isInGitRepository(cwd: string) {
  const { exitCode } = await x('git', ['rev-parse', '--is-inside-work-tree'], {
    nodeOptions: { cwd },
  });

  return exitCode === 0;
}

async function isDefaultBranchSet(cwd: string) {
  const { exitCode } = await x('git', ['config', 'init.defaultBranch'], {
    nodeOptions: { cwd },
  });

  return exitCode === 0;
}

/*
Initialize a Git repo on the project.

Based on https://github.com/vercel/next.js/blob/canary/packages/create-next-app/helpers/git.ts
*/
export async function tryGitInit(cwd: string): Promise<boolean> {
  const { exitCode } = await x('git', ['--version']);
  if (exitCode !== 0) return false;

  if (await isInGitRepository(cwd)) return false;

  try {
    await x('git', ['init'], {
      throwOnError: true,
      nodeOptions: { cwd },
    });

    if (!(await isDefaultBranchSet(cwd))) {
      await x('git', ['checkout', '-b', 'main'], {
        throwOnError: true,
        nodeOptions: {
          cwd,
        },
      });
    }

    await x('git', ['add', '-A'], {
      throwOnError: true,
      nodeOptions: {
        cwd,
      },
    });

    await x(
      'git',
      ['commit', '-m', 'Initial commit from Create Fumadocs App'],
      {
        throwOnError: true,
        nodeOptions: {
          cwd,
        },
      },
    );
    return true;
  } catch {
    await fs.rmdir(join(cwd, '.git'), { recursive: true }).catch(() => null);

    return false;
  }
}

export function pick<T extends object, K extends keyof T>(
  obj: T,
  keys: K[],
): Pick<T, K> {
  const result: Partial<T> = {};

  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }

  return result as Pick<T, K>;
}
