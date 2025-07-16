import * as fs from 'node:fs/promises';
import { join } from 'node:path';
import { x } from 'tinyexec';

/*
Initialize a Git repo on the project.

Based on https://github.com/vercel/next.js/blob/canary/packages/create-next-app/helpers/git.ts
*/

async function isInGitRepository(cwd: string) {
  const { exitCode } = await x('git', ['rev-parse', '--is-inside-work-tree'], {
    nodeOptions: { cwd },
  });

  return exitCode !== 0;
}

async function isDefaultBranchSet(cwd: string) {
  const { exitCode } = await x('git', ['config', 'init.defaultBranch'], {
    nodeOptions: { cwd },
  });

  return exitCode !== 0;
}

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
